const Base = require('../base');
let {emitter,vars,permissions} = require('../../globals')

Var = Base({_emitter:emitter,_table:'var',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'name',type:'VARCHAR(255)',constraint:'UNIQUE'},
  {name:'value',type:'VARCHAR(255)'}
]});
Var.get = async function(conn,name){
  let v = await Var.search({name:name});
  if(v.length>0) return JSON.parse(v[0].value);
  return "";
}
Var.loadVars = function(conn){
  return Var.list(conn,0,10000).then(vs => vs.forEach(v => { vars[v.name] = JSON.parse(v.value) }))
}
module.exports = {Var};
