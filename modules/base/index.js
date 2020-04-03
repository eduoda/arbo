const Notorm = require('notorm');
const camelize = require('camelcase');
let express = require("express");
let {app,vars,permissions} = require('../../globals')

module.exports = ({_restify,_requireSection,_basePath,_dbFlavor,_emitter,_className,_table,_columns}) => {
  _className = _className || camelize(_table,{pascalCase: true});
  _restify = _restify || false;
  _requireSection = _requireSection || false;
  _basePath = _basePath || "/"+_className;
  let _ownerIdField = _columns.filter(col => {return col.name === "owner_id" || col.name === "ownerId"}).length > 0;

  // Small hack to create a dymanic named class
  let namedClass = {[_className]: class extends Notorm({_dbFlavor,_emitter,_className,_table,_columns}) {
    static get basePath(){
      return _basePath;
    }
    static async setup(conn){
      await this.createTable(conn);
    }
    static async uninstall(conn){
      this.dropTable(conn);
    }
    // copied from Permission class to avoid circular dependency.
    static async ensurePermission(conn,userId,sectionId,permissionsIds){
      if(!sectionId) sectionId = vars['section1'];
      let query = `SELECT user_id FROM permission_cache WHERE (? IS NULL AND user_id IS NULL OR user_id = ?) AND section_id = ? AND permission_id IN (?);`;
      let p = await this.rawAll(conn,query,[userId,userId,sectionId,permissionsIds]);
      if(p.length==0) throw 403;
    }
    static async searchDeep(conn,userId,offset,limit,sectionId=null,deep=true,whereInjection='',whereValuesInjection=[],selectInjection='',joinInjection='',groupInjection=''){
      if(_requireSection){
        let query = `
          SELECT ${this.table}.* ${selectInjection!=''?','+selectInjection:''}
          FROM ${this.table}
          JOIN section AS parent_section ON parent_section.id = ${this.table}.section_id
          JOIN section AS ancestor ON parent_section.lft BETWEEN ancestor.lft AND ancestor.rgt ${sectionId?'AND ancestor.id = ?':''}
          JOIN permission_cache ON permission_cache.section_id = ancestor.id AND permission_cache.user_id = ?
          ${joinInjection}
          WHERE
            (
              ${_ownerIdField?`
                (permission_cache.permission_id = ${permissions['read own'+_className]} AND
                ${this.table}.owner_id = ?) OR`:``}
              permission_cache.permission_id = ${permissions['read '+_className]} OR
              permission_cache.permission_id = ${permissions['admin']}
            )
            ${whereInjection!=''?'AND ('+whereInjection+')':''}
          ${groupInjection}
          LIMIT ${offset},${limit}
        ;`;
        console.log(query);
        let values = [];
        if(sectionId) values.push(sectionId);
        values.push(userId);
        if(_ownerIdField) values.push(userId);
        return this.runSelect(conn,query,values.concat(whereValuesInjection));
      } else {
        let query = `
          SELECT ${this.table}.* ${selectInjection!=''?','+selectInjection:''}
          FROM ${this.table}
          ${joinInjection}
          ${whereInjection!=''?'WHERE '+whereInjection:''}
          ${groupInjection}
          LIMIT ${offset},${limit}
        ;`;
        console.log(query);
        return this.runSelect(conn,query,whereValuesInjection);
      }
      return [];
      // sectionId = sectionId || vars['section1'];
      // let query = `
      //   SELECT ${this.table}.* ${selectInjection!=''?','+selectInjection:''}
      //   FROM ${this.table}
      //   ${sectionId && deep?`
      //     JOIN section AS parent_section ON parent_section.id = ${this.table}.section_id
      //     JOIN section AS ancestor ON parent_section.lft BETWEEN ancestor.lft AND ancestor.rgt
      //     JOIN permission_cache ON permission_cache.section_id = ancestor.id AND permission_cache.user_id AND
      //          permission_cache.permission_id IN (?)
      //   `:''}
      //   ${sectionId && !deep?`
      //     JOIN section AS parent_section ON parent_section.id = ${this.table}.section_id
      //     JOIN section AS ancestor ON parent_section.lft BETWEEN ancestor.lft AND ancestor.rgt
      //     JOIN permission_cache ON permission_cache.section_id = ancestor.id AND permission_cache.user_id AND
      //          permission_cache.permission_id IN (?)
      //   `:''}
      //   ${sectionId || whereInjection?'WHERE':''}
      //     ${sectionId &&  deep?'ancestor.id = ?':''}
      //     ${sectionId && !deep?`${this.table}.section_id = ?`:''}
      //     ${whereInjection!=''? 'AND ('+whereInjection+')': ''}
      //   LIMIT ${offset},${limit}
      // ;`;
      // let values = [];
      // if(sectionId)
      //   values.push(sectionId);
      // return this.runSelect(conn,query,values.concat(whereValuesInjection));
    }

    // ownerId is the owner before save
    static async checkCRUDPermission(req,res,next,target){
      let sectionId = vars['section1'];
      let permissionsToEnsure = [permissions['admin']];
      if(req.method==="POST"){
        if(_requireSection){
          if(!req.body.hasOwnProperty('sectionId') || req.body.sectionId==null)
            throw 400;_restify
          sectionId = req.body.sectionId;
        }
        permissionsToEnsure.push(permissions['create '+_className]);
      }else if(req.method==="PUT"){
        if(_requireSection || req.body.hasOwnProperty('sectionId')){
          if(req.body.hasOwnProperty('sectionId') && target.sectionId != req.body.sectionId){
            await this.ensurePermission(res.locals.conn,res.locals.user.id,target.sectionId,[permissions['delete '+_className]]);
            await this.ensurePermission(res.locals.conn,res.locals.user.id,req.body.sectionId,[permissions['create '+_className]]);
          }
          sectionId = req.body.sectionId;
        }
        permissionsToEnsure.push(permissions['edit '+_className]);
        if(_ownerIdField){
          // only admin can change owner
          if(req.body.hasOwnProperty('ownerId') && req.body.ownerId != target.ownerId)
            await this.ensurePermission(res.locals.conn,res.locals.user.id,sectionId,[permissions['admin']]);
          if(target.ownerId === res.locals.user.id)
            permissionsToEnsure.push(permissions['edit own '+_className]);
        }
          // console.log(target)
          // console.log(permissionsToEnsure)
      }else if(req.method==="GET" && target){
        permissionsToEnsure.push(permissions['read '+_className]);
        if(_requireSection && target.sectionId)
          sectionId = target.sectionId;
        if(_ownerIdField && target.ownerId === res.locals.user.id){
          permissionsToEnsure.push(permissions['read own '+_className]);
        }
      }else if(req.method==="GET"){
        if(_requireSection)
          sectionId = req.params.sid;
        permissionsToEnsure.push(permissions['list '+_className]);
      }else if(req.method==="DELETE"){
        let permissionsToEnsure = [permissions['delete '+_className]];
        if(_requireSection)
          sectionId = target.sectionId;
        if(_ownerIdField && target.ownerId === res.locals.user.id)
          permissionsToEnsure.push(permissions['delete own '+_className]);
      }
      await this.ensurePermission(res.locals.conn,res.locals.user.id,sectionId,permissionsToEnsure);
    }
    //addMiddleware(app){app.use(...)}
    //test(request){require("./test.js").TestUser.runTests(request)}
  }}

  // rest endpoints for CRUD
  let baseClass = namedClass[_className];
  if(_restify){
    baseClass.router = express.Router();
    baseClass.permissions = ["create","read","list","search","edit","delete"];
    if(_ownerIdField)
      baseClass.permissions = baseClass.permissions.concat(["read own","edit own","delete own"]);
    baseClass.permissions = baseClass.permissions.map(p=>p+' '+_className);

    baseClass.router.post("/",async (req,res,next) => {
      try{
        await baseClass.checkCRUDPermission(req,res,next);
        console.log(req.body)
        res.json(await (await new baseClass(req.body).save(res.locals.conn)).prepare(res.locals.conn));
      }catch(e){next(e)}
    });

    baseClass.router.get("/:id",async (req,res,next) => {
      try{
        let e = await new baseClass({id:req.params.id}).load(res.locals.conn);
        await baseClass.checkCRUDPermission(req,res,next,e);
        res.json(await e.prepare(res.locals.conn));
      }catch(e){next(e)}
    });

    baseClass.router.get(_requireSection?"/Section/:sid":"/",async (req,res,next) => {
      try{
        await baseClass.checkCRUDPermission(req,res,next);
        let offset = req.query.offset || 0;
        let limit = req.query.limit || 10;
        let es = await baseClass.searchDeep(res.locals.conn,res.locals.user.id,offset,limit,req.params.sid);
        es.forEach(async e => {await e.prepare(res.locals.conn)});
        res.json(es);
      }catch(e){next(e)}
    });

    baseClass.router.put("/",async (req,res,next) => {
      try{
        let e = await new baseClass({id:req.body.id}).load(res.locals.conn);
        if(_requireSection && !req.body.hasOwnProperty('sectionId'))
          req.body.sectionId = e.sectionId;
        await baseClass.checkCRUDPermission(req,res,next,e);
        res.json(await (await new baseClass(req.body).save(res.locals.conn)).prepare(res.locals.conn));
      }catch(e){next(e)}
    });

    baseClass.router.delete("/:id",async (req,res,next) => {
      try{
        let e = await new baseClass({id:req.params.id}).load(res.locals.conn);
        await baseClass.checkCRUDPermission(req,res,next,e);
        await e.delete(res.locals.conn);
        res.json(await e.prepare(res.locals.conn));
      }catch(e){next(e)}
    });

  }
  return baseClass;
}
