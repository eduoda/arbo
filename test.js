var assert = require('assert');
let request = require('supertest');
request = request('http://localhost:3000');

let {Var} = require('./modules/var');
let {Permission,Role,RolePermission,PermissionCache} = require('./modules/permission');
let {User,Token} = require('./modules/user');
let {Section,Membership,MembershipRole} = require('./modules/section');
let {Content,ContentSection,Page} = require('./modules/content');

let modules = [
  Var,
  User,
  Section,
  Membership,
  // Permission,
  // Role,
  // RolePermission,
  // PermissionCache,
  // Token,
  // MembershipRole,
  // Content,
  // ContentSection,
  // Page
]
request.data={};
describe('Arbo Tests', function() {
  modules.forEach(async (mod) => {
    if(mod.test){
      mod.test(request);
    }
  });
})
