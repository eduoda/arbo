let express = require("express");
const Base = require('../base');
let {emitter,vars,permissions} = require('../../globals')
const { MembershipRole } = require('../section');

class Permission extends Base({_restify:true,_emitter:emitter,_table:'permission',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'permission',type:'VARCHAR(255)',constraint:'UNIQUE'},
  {name:'description',type:'VARCHAR(255)'}
]}){
  static async setup(conn){
    await super.setup(conn);
    let adminPermission = await new Permission({permission:'admin'}).save(conn);
    await new Var({name:'adminPermission',value:adminPermission.id}).save(conn);
  }
  static loadPermissions(conn){
    return this.list(conn,0,10000).then(ls => ls.forEach(v=> { permissions[v.permission] = v.id }))
  }
  // static async ensurePermission(conn,userId,sectionId,permissionId){
  //   let query = `SELECT user_id FROM permission_cache WHERE (? IS NULL AND user_id IS NULL OR user_id = ?) AND section_id = ? AND (permission_id = ? OR permission_id = ?);`;
  //   let p = await this.rawAll(conn,query,[userId,userId,sectionId,permissionId,permissions['admin']]);
  //   if(p.length>0) return;
  //   throw 403;
  // }
}

class Role extends Base({_restify:true,_emitter:emitter,_table:'role',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'name',type:'VARCHAR(255)',constraint:'UNIQUE'}
]}){
  static async setup(conn){
    await super.setup(conn);
    let adminRole = await new Role({name:'admin'}).save(conn);
    let userRole = await new Role({name:'user'}).save(conn);
    let guestRole = await new Role({name:'guest'}).save(conn);
    await new Var({name:'adminRole',value:adminRole.id}).save(conn);
    await new Var({name:'userRole',value:userRole.id}).save(conn);
    await new Var({name:'guestRole',value:guestRole.id}).save(conn);
  }
}

class RolePermission extends Base({_restify:true,_emitter:emitter,_table:'role_permission',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'role_id',type:'INT(11)',foreignKey:{references:'role(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'permission_id',type:'INT(11)',foreignKey:{references:'permission(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
]}){
  static async setup(conn){
    await super.setup(conn);
    await new RolePermission({roleId:vars['adminRole'],permissionId:vars['adminPermission']}).save(conn);
  }
}

class PermissionCache extends Base({_restify:true,_emitter:emitter,_table:'permission_cache',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'user_id',type:'INT(11)',index:'user_permission',foreignKey:{references:'user(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'permission_id',type:'INT(11)',index:'user_permission',foreignKey:{references:'permission(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'section_id',type:'INT(11)',index:'user_permission',foreignKey:{references:'section(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'permission',type:'VARCHAR(255)'},
  {name:'membership_id',type:'INT(11)',index:'membership_id',foreignKey:{references:'membership(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'membership_role_id',type:'INT(11)',index:'membership_role_id',foreignKey:{references:'membership_role(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'role_id',type:'INT(11)',index:'role_id',foreignKey:{references:'role(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'role_permission_id',type:'INT(11)',index:'role_permission_id',foreignKey:{references:'role_permission(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'permission_id',type:'INT(11)',index:'permission_id',foreignKey:{references:'permission(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
]}){
  static async setup(conn){
    await super.setup(conn);
    await this.rebuild(conn);
  }
  static async load(conn){
    emitter.addListener('entityCreateSection',(conn,section) => {
      PermissionCache.build(conn,`WHERE leaf.id=${section.id}`);
    });
    emitter.addListener('entityCreateMembership',(conn,membership) => {
      PermissionCache.build(conn,`WHERE membership.id=${membership.id}`);
    });
    emitter.addListener('entityCreateMembershipRole',(conn,membershipRole) => {
      PermissionCache.build(conn,`WHERE membership_role.id=${membershipRole.id}`);
    });
    emitter.addListener('entityCreateRolePermission',(conn,rolePermission) => {
      PermissionCache.build(conn,`WHERE role_permission.id=${rolePermission.id}`);
    });
    //PermissionCache.build(conn);
  }
  static async rebuild(conn){
    await this.rawDelete(conn,`TRUNCATE permission_cache;`,[]);
    let n = await PermissionCache.build(conn);
    emitter.emit('permissionCacheRebuild',conn,n);
  }
  static async build(conn,where=''){
    let n = await this.rawInsert(conn,`
      INSERT INTO permission_cache (user_id,section_id,permission_id,permission)
      SELECT
        membership.user_id AS user_id,
        leaf.id as section_id,
        permission.id as permission_id,
        permission.permission AS permission,
        membership.id as membership_id,
        membership_role.id as membership_role_id,
        membership_role.role_id as role_id,
        role_permission.id as role_permission_id,
        permission.id as permission_id
      FROM section AS leaf
      LEFT JOIN section ON section.lft <= leaf.lft AND section.rgt >= leaf.rgt
      INNER JOIN membership ON membership.section_id = section.id
      INNER JOIN membership_role ON membership_role.membership_id = membership.id
      INNER JOIN role_permission ON role_permission.role_id = membership_role.role_id
      LEFT JOIN permission ON permission.id = role_permission.permission_id
      ${where};
    `,[]);
    emitter.emit('permissionCacheUpdate',conn,n);
    return n;
  }
}

module.exports = {
  Permission,
  Role,
  RolePermission,
  PermissionCache
};
