let {app,emitter,vars,permissions} = require('./globals')
let express = require("express");
let cors = require('cors')
let {MySQL} = require('./mysql');
let {Var} = require('./modules/var');
let {Permission,Role,RolePermission,PermissionCache} = require('./modules/permission');
let {User,Token} = require('./modules/user');
let {Section,Membership,MembershipRole} = require('./modules/section');
let {Content,ContentSection,Page} = require('./modules/content');

app = express();
let mysql = new MySQL({
  connectionLimit: 10,
  host: "localhost",
  database: "arbo",
  user: "root",
  password: "root"
});
app.use(cors());
app.use(express.json());
app.use(mysql.mw());
app.modules = [];

app.addModule = async function(conn,mod){
  app.modules.push(mod);
  try{
    if(!vars['module_'+mod.name]){
      console.log("Installing "+mod.name);
      // new module
      if(mod.setup)
        await mod.setup(conn);
      else
        await mod.createTable(conn);
      if(mod.permissions)
        mod.permissions.forEach(async perm => {await new Permission({permission:perm}).save(conn)});
      await new Var({name:'module_'+mod.name,value:true}).save(conn);
      await Var.loadVars(conn).then(console.log("Vars reloaded"));
      await Permission.loadPermissions(conn).then(console.log("Permissions reloaded"));
      console.log("Installed "+mod.name);
    }
    if(mod.load)
      await mod.load(conn);
  }catch(e){
    console.error("Error installing module "+mod.name);
    return;
  }
}

app.wakeUp = async function(){
  try{
    let conn = await mysql.getConn();

    await User.rawRun(conn,'SET FOREIGN_KEY_CHECKS = 0;', []);
    [Var,Permission,Role,RolePermission,User,Token,Section,Membership,MembershipRole,PermissionCache,Content,ContentSection,Page]
      .forEach(async mod => {if(mod.uninstall) await mod.uninstall(conn); else await mod.dropTable(conn)});
    await User.rawRun(conn,'SET FOREIGN_KEY_CHECKS = 1;', []);

    let tables = await User.rawAll(conn,'SHOW TABLES;').then(res => res.map(x => x.Tables_in_Arbo))

    if(tables.includes("var")){
      // load infos
      await Var.loadVars(conn).then(console.log("Vars loaded"));
    }else {
      // empty db, new installation
      await Var.setup(conn);
      await new Var({name:'module_'+Var.name,value:true}).save(conn);
      await Var.loadVars(conn).then(console.log("Vars loaded"));
    }

    if(tables.includes("permission")){
      await Permission.loadPermissions(conn).then(console.log("Permissions loaded"));
    }

    await app.addModule(conn,Var);
    await app.addModule(conn,Permission);
    await app.addModule(conn,Role);
    await app.addModule(conn,RolePermission);
    await app.addModule(conn,User);
    await app.addModule(conn,Token);
    await app.addModule(conn,Section);
    await app.addModule(conn,Membership);
    await app.addModule(conn,MembershipRole);
    await app.addModule(conn,PermissionCache);
    await app.addModule(conn,Content);
    await app.addModule(conn,ContentSection);
    await app.addModule(conn,Page);

    for(let i = 0;i<app.modules.length; i++){
      let mod = app.modules[i];
      if(mod.addMiddleware){
        mod.addMiddleware(app);
      }
    }
    for(let i = 0;i<app.modules.length; i++){
      let mod = app.modules[i];
      if(mod.router){
        console.log("Add "+mod.name+" route at "+mod.basePath)
        app.use(mod.basePath,mod.router);
      }
    }

    conn.release();
  }catch(e){
    console.log(e);
  }
}

if(process.argv[2]==='run'){
  app.wakeUp().then(()=>{
    app.use(function (err, req, res, next) {
      if(res.headersSent) return next(err);
      if(Number.isInteger(err)) res.status(err).send();
      else res.status(500).send();
      next(err);
    });
    app.server = app.listen(3000, () => {console.log("Server running on port 3000")});
  });
}

module.exports = app;
