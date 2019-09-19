const Notorm = require('notorm');
const camelize = require('camelcase');
let express = require("express");
let {app,vars,permissions} = require('../../globals')

module.exports = ({_restify,_requireSection,_basePath,_dbFlavor,_emitter,_className,_table,_columns}) => {
  _className = _className || camelize(_table,{pascalCase: true});
  _restify = _restify || false;
  _requireSection = _requireSection || false;
  _basePath = _basePath || "/"+_className;
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
    static async ensurePermission(conn,userId,sectionId,permissionId){
      let query = `SELECT user_id FROM permission_cache WHERE (? IS NULL AND user_id IS NULL OR user_id = ?) AND section_id = ? AND (permission_id = ? OR permission_id = ?);`;
      let p = await this.rawAll(conn,query,[userId,userId,sectionId,permissionId,permissions['admin']]);
      if(p.length>0) return;
      throw 403;
    }
    static async searchDeep(conn,userId,offset,limit,sectionId=null,deep=true,whereInjection='',whereValuesInjection=[],selectInjection='',joinInjection=''){
      let query = `
        SELECT ${this.table}.* ${selectInjection!=''?','+selectInjection:''}
        FROM ${this.table}
        ${sectionId && deep?`
          JOIN section AS parent_section ON parent_section.id = ${this.table}.section_id
          JOIN section AS ancestor ON parent_section.lft BETWEEN ancestor.lft AND ancestor.rgt
        `:''}
        ${sectionId || whereInjection?'WHERE':''}
          ${sectionId &&  deep?'ancestor.id = ?':''}
          ${sectionId && !deep?`${this.table}.section_id = ?`:''}
          ${whereInjection!=''? 'AND ('+whereInjection+')': ''}
        LIMIT ${offset},${limit}
      ;`;
      let values = [];
      if(sectionId)
        values.push(sectionId);
      return this.runSelect(conn,query,values.concat(whereValuesInjection));
    }

    static async checkCRUDPermission(req,res,next,sectionId){
      if(req.method==="PUT"){
        let old = await new baseClass({id:req.body.id}).load(res.locals.conn);
        if(_requireSection || req.body.sectionId || old.sectionId){
          if(req.body.hasOwnProperty('sectionId') && old.sectionId != req.body.sectionId){
            await this.ensurePermission(res.locals.conn,res.locals.user.id,old.sectionId,permissions['delete '+_className]);
            await this.ensurePermission(res.locals.conn,res.locals.user.id,req.body.sectionId,permissions['create '+_className]);
          }
        }
      }
      if(req.method==="POST"){
        if(_requireSection && !req.body.sectionId)
          throw 400;
        sectionId = req.body.sectionId;
      }else if(req.method==="PUT"){
        if(_requireSection && req.body.hasOwnProperty('sectionId') && req.body.sectionId==null)
          throw 400;
        sectionId = req.body.sectionId;
      }
      sectionId = sectionId?sectionId:vars['section1'];
      let actionsMap = {
        POST:'create',
        GET:'read',
        PUT:'edit',
        DELETE:'delete'
      }
      await this.ensurePermission(res.locals.conn,res.locals.user.id,sectionId,permissions[actionsMap[req.method]+' '+_className]);
    }
    //addMiddleware(app){app.use(...)}
    //test(request){require("./test.js").TestUser.runTests(request)}
  }}

  // rest endpoints for CRUD
  let baseClass = namedClass[_className];
  if(_restify){
    baseClass.router = express.Router();
    baseClass.permissions = ["create","read","edit","delete"].map(p=>p+' '+_className);

    baseClass.router.post("/",async (req,res,next) => {
      try{
        await baseClass.checkCRUDPermission(req,res,next);
        res.json(await (await new baseClass(req.body).save(res.locals.conn)).prepare(res.locals.conn));
      }catch(e){next(e)}
    });

    baseClass.router.get("/:id",async (req,res,next) => {
      try{
        let e = await new baseClass({id:req.params.id}).load(res.locals.conn);
        await baseClass.checkCRUDPermission(req,res,next,e.sectionId);
        res.json(await e.prepare(res.locals.conn));
      }catch(e){next(e)}
    });

    baseClass.router.get(_requireSection?"/Section/:id/":"/",async (req,res,next) => {
      try{
        await baseClass.checkCRUDPermission(req,res,next);
        let offset = req.query.offset || 0;
        let limit = req.query.limit || 10;
        let es = await baseClass.searchDeep(res.locals.conn,res.locals.user.id,offset,limit,req.params.id);
        es.forEach(async e => {await e.prepare(res.locals.conn)});
        res.json(es);
      }catch(e){next(e)}
    });

    baseClass.router.put("/",async (req,res,next) => {
      try{
        await baseClass.checkCRUDPermission(req,res,next);
        res.json(await (await new baseClass(req.body).save(res.locals.conn)).prepare(res.locals.conn));
      }catch(e){next(e)}
    });

    baseClass.router.delete("/:id",async (req,res,next) => {
      try{
        let e = await new baseClass({id:req.params.id}).load(res.locals.conn);
        await baseClass.checkCRUDPermission(req,res,next,e.sectionId);
        await e.delete(res.locals.conn);
        res.json(await e.prepare(res.locals.conn));
      }catch(e){next(e)}
    });

  }
  return baseClass;
}
