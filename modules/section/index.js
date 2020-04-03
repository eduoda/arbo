let express = require("express");
const Base = require('../base');
let {emitter,vars,permissions} = require('../../globals');

class Section extends Base({_restify:true,_requireSection:true,_emitter:emitter,_table:'section',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'owner_id',type:'INT(11)',foreignKey:{references:'user(id)',onDelete:'SET NULL',onUpdate:'CASCADE'}},
  {name:'section_id',type:'INT(11)',foreignKey:{references:'section(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'lft',type:'INT(11)',index:'lft'},
  {name:'rgt',type:'INT(11)',index:'rgt'},
  {name:'name',type:'VARCHAR(255)'}
]}){
  static async setup(conn){
    await super.setup(conn);
    let section1 = await new Section({name:'Section 1',ownerId:vars['root'],lft:1,rgt:2}).save(conn);
    await new Var({name:'section1',value:section1.id}).save(conn);
  }
  static async load(conn){
    emitter.addListener('entityPreSaveSection',async (conn,section) => {
      let create = section.id==null;
      if(create){
        if(section.sectionId!=null){
          let parentSection = await new Section({id:section.sectionId}).load(conn);
          await Section.rawUpdate(conn,`UPDATE section SET lft=lft+2 WHERE lft >= ?; `,parentSection.rgt);
          await Section.rawUpdate(conn,`UPDATE section SET rgt=rgt+2 WHERE rgt >= ?; `,parentSection.rgt);
          section.lft = parentSection.rgt;
          section.rgt = parentSection.rgt+1;
        }
      }
    },true);
    emitter.addListener('entityPrepareSection',(conn,section) => {
      delete section.lft;
      delete section.rgt;
    });
  }
  static test(request){require("./test.js").TestSection.runTests(request)}
}

class Membership extends Base({_restify:true,_requireSection:true,_emitter:emitter,_table:'membership',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'user_id',type:'INT(11)',index:'status',foreignKey:{references:'user(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'section_id',type:'INT(11)',index:'status',foreignKey:{references:'section(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'status',type:"ENUM('pending','active','revoked')",index:'status'}
]}){
  static async setup(conn){
    await super.setup(conn);
    let rootMembership = await new Membership({userId:vars['root'],sectionId:vars['section1'],status:'active'}).save(conn);
    await new Var({name:'rootMembership',value:rootMembership.id}).save(conn);
    let guestMembership = await new Membership({userId:vars['guest'],sectionId:vars['section1'],status:'active'}).save(conn);
    await new Var({name:'guestMembership',value:guestMembership.id}).save(conn);
  }
  static test(request){require("./test.js").TestMembership.runTests(request)}
}

class MembershipRole extends Base({_restify:true,_requireSection:false,_emitter:emitter,_table:'membership_role',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'membership_id',type:'INT(11)',foreignKey:{references:'membership(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'role_id',type:'INT(11)',foreignKey:{references:'role(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}}
]}){
  static async setup(conn){
    await super.setup(conn);
    await new MembershipRole({membershipId:vars['rootMembership'],roleId:vars['adminRole']}).save(conn);
    await new MembershipRole({membershipId:vars['guestMembership'],roleId:vars['guestRole']}).save(conn);
  }
}

module.exports = {Section,Membership,MembershipRole};
