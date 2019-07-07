let express = require("express");
const Base = require('../base');
let {emitter,permissions} = require('../../globals');

Content = Base({_emitter:emitter,_table:'content',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'owner_id',type:'INT(11)',foreignKey:{references:'user(id)',onDelete:'SET NULL',onUpdate:'CASCADE'}}
]});
Content.contentTypes={};
// Content.basePath = '/Section';
Content.permissions = ["create","read any","read own","edit any","edit own","delete any","delete own"];
Content.addContentType = function(c){
  c.permissions = Content.permissions.map(p=>p+' '+c.name);
  Content.contentTypes[c.name] = c;
}
Content.create = async function(conn,data,ownerId,sectionId){
  let content = await new Content({ownerId:ownerId}).save(conn);
  await new ContentSection({contentId:content.id,sectionId:sectionId}).save(conn);
  data.contentId = content.id;
  return await data.save(conn);
}
Content.get = async function(conn,type,id){
  return await new Content.contentTypes[type]({id:id}).load(conn);
}
Content.update = async function(conn,data){
  let old = await new Content.contentTypes[data.constructor.name]({id:data.id}).load(conn);
  data.contentId = old.contentId;
  return await data.save(conn);
}
Content.delete = async function(conn,type,id){
  let e = await new Content.contentTypes[type]({id:id}).load(conn);
  await new Content({id:e.contentId}).delete(conn);
  return e;
}
Content.search = async function(conn,sectionId,type,userId,offset,limit,whereInjection='',whereValuesInjection=[],selectInjection='',joinInjection=''){
  let eClass = Content.contentTypes[type];
  let query = `
    SELECT ${eClass.getSQLColumns()} ${selectInjection!=''?','+selectInjection:''}
    FROM ${eClass.table}
    JOIN content ON content.id = ${eClass.table}.content_id
    JOIN content_section ON content_section.content_id = content.id
    JOIN permission_cache ON permission_cache.section_id = content_section.section_id
    ${joinInjection}
    WHERE
      (? IS NULL AND permission_cache.user_id IS NULL OR permission_cache.user_id = ?) AND
      content_section.section_id = ? AND
      (
        (permission_cache.permission_id = ${permissions['admin']})
        OR
        (content.owner_id = ? && permission_cache.permission_id = ${permissions['read own']})
        OR
        (permission_cache.permission_id = ${permissions['read any']})
      )
      ${whereInjection!=''? 'AND ('+whereInjection+')': ''}
    LIMIT ${offset},${limit}
  ;`;
  return eClass.runSelect(conn,query,[userId,userId,sectionId,userId].concat(whereValuesInjection));
}
Content.checkPermission = async function(conn,userId,sectionId,type,action,contentId){
  if(action=='create'){
    if(sectionId==null)
      throw 405;
    let permNeeded = ["admin","create"];
    let permIds = permNeeded.reduce((perms,p)=>{perms.push(permissions[p]);perms.push(permissions[p+' '+type]);return perms;},[])
    let query = `
      SELECT user_id, permission_id
      FROM permission_cache
      WHERE
        (? IS NULL AND user_id IS NULL OR user_id = ?) AND
        section_id = ? AND
        permission_id IN (${permIds.join(',')})
    ;`;
    let p = await Permission.rawAll(conn,query,[userId,userId,sectionId]);
    if(p.length>0)
      return;
  }else if(["read","edit","delete"].includes(action)){
    let content = await new Content({id:contentId}).load(conn);
    if(content.ownerId === userId){
      if(action=="read")
        permNeeded = ["admin","read any","read own"];
      else if(action=="edit")
        permNeeded = ["admin","edit any","edit own"];
      else if(action=="delete")
        permNeeded = ["admin","delete any","delete own"];
    }else{
      if(action=="read")
        permNeeded = ["admin","read any"];
      else if(action=="edit")
        permNeeded = ["admin","edit any"];
      else if(action=="delete")
        permNeeded = ["admin","delete any"];
    }
    let permIds = permNeeded.reduce((perms,p)=>{perms.push(permissions[p]);perms.push(permissions[p+' '+type]);return perms;},[])
    if(sectionId==null){
      // check if user has permission in any section
      let query = `
        SELECT permission_cache.user_id, permission_cache.permission_id
        FROM permission_cache
        JOIN content_section ON content_section.section_id = permission_cache.section_id
        WHERE
          (? IS NULL AND permission_cache.user_id IS NULL OR user_id = ?) AND
          content_section.content_id = ? AND
          permission_cache.permission_id IN (${permIds.join(',')})
      ;`;
      let p = await Permission.rawAll(conn,query,[userId,userId,contentId]);
      if(p.length>0)
        return;
    }else{
      // check if user has permission in the given section
      let query = `
        SELECT permission_cache.user_id, permission_cache.permission_id
        FROM permission_cache
        JOIN content_section ON content_section.section_id = permission_cache.section_id
        WHERE
          (? IS NULL AND permission_cache.user_id IS NULL OR user_id = ?) AND
          content_section.content_id = ? AND
          permission_cache.section_id = ? AND
          permission_cache.permission_id IN (${permIds.join(',')})
      ;`;
      let p = await Permission.rawAll(conn,query,[userId,userId,contentId,sectionId]);
      if(p.length>0)
        return;
    }
  }
  throw 403;
}

ContentSection = Base({_emitter:emitter,_table:'content_section',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'content_id',type:'INT(11)',index:'content_section',foreignKey:{references:'content(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'section_id',type:'INT(11)',index:'content_section',foreignKey:{references:'section(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}}
]});

Page = Base({_emitter:emitter,_table:'page',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'content_id',type:'INT(11)',foreignKey:{references:'content(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'title',type:'TEXT'},
  {name:'body',type:'TEXT'}
]});
Content.addContentType(Page);

Content.router = express.Router();

Content.router.post("/:sectionId/:type", async (req, res, next) => {
  try{
    await Content.checkPermission(res.locals.conn,res.locals.user.id,req.params.sectionId,'create',req.params.type);
    let e = await Content.create(res.locals.conn,new Content.contentTypes[req.params.type](req.body),res.locals.user.id,req.params.sectionId);
    res.json(e.prepare(res.locals.conn));
  }catch(e){next(e)}
});

Content.router.get("/:sectionId/:type/:id", async (req, res, next) => {
  try{
    let e = await Content.get(res.locals.conn,req.params.type,req.params.id);
    await Content.checkPermission(res.locals.conn,res.locals.user.id,req.params.sectionId,req.params.type,'read',e.contentId);
    res.json(e.prepare(res.locals.conn));
  }catch(e){next(e)}
});

Content.router.get("/:sectionId/:type", async (req, res, next) => {
  try{
    let offset = req.query.offset || 0;
    let limit = req.query.limit || 10;
    let es = await Content.search(res.locals.conn,req.params.sectionId,req.params.type,res.locals.user.id,offset,limit);
    es.forEach(e => {e.prepare(res.locals.conn)});
    res.json(es);
  }catch(e){next(e)}
});

Content.router.put("/:sectionId/:type", async (req, res, next) => {
  try{
    await Content.checkPermission(res.locals.conn,res.locals.user.id,req.params.sectionId,'edit',req.params.type);
    let e = await Content.update(res.locals.conn,new Content.contentTypes[req.params.type](req.body));
    res.json(e.prepare(res.locals.conn));
  }catch(e){next(e)}
});

Content.router.delete("/:sectionId/:type/:id", async (req, res, next) => {
  try{
    await Content.checkPermission(res.locals.conn,res.locals.user.id,req.params.sectionId,'delete',req.params.id);
    let e = await Content.delete(res.locals.conn,req.params.type,req.params.id);
    res.json(e.prepare(res.locals.conn));
  }catch(e){next(e)}
});


module.exports = {Content,ContentSection,Page};