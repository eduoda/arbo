let express = require("express");
const Base = require('../base');
let {emitter,vars,permissions} = require('../../globals');
let CryptUtils = require('../cryptUtils');

class User extends Base({_restify:true,_emitter:emitter,_table:'user',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'login',type:'VARCHAR(255)',constraint:'UNIQUE NOT NULL'},
  {name:'email',type:'VARCHAR(255)'},
  {name:'password',type:'VARCHAR(255)'},
  {name:'salt',type:'VARCHAR(255)'},
  {name:'status',type:"ENUM('active','deleted','blocked')",index:'status'}
]}){
  static async setup(conn){
    await super.setup(conn);
    let salt = CryptUtils.randomString(10);
    let password = CryptUtils.hash(salt,'root');
    let root = await new User({login:'root',password:password,salt:salt,status:'active'}).save(conn);
    let guest = await new User({login:'guest',password:null,salt:null,status:'active'}).save(conn);
    await new Var({name:'guest',value:guest.id}).save(conn);
    await new Var({name:'root',value:root.id}).save(conn);
  }
  static async load(conn){
    emitter.addListener('preCheckCRUDPermissionUser',(req,res,next,target,sectionId,permissionsToEnsure,hookData) => {
      if(req.method == 'DELETE') return;
      if(req.method == 'GET' || req.method == 'PUT'){
        if(res.locals.user.id==target.id){
          hookData.override = true;
          hookData.allow = true;
        }
      }
    });
    emitter.addListener('entityPrepareUser',(conn,user) => {
      delete user.password;
      delete user.salt;
    });
    emitter.addListener('entityPreCreateUser',(conn,user) => {
      user.salt = CryptUtils.randomString(10);
      user.password = CryptUtils.hash(user.salt,user.password);
      user.status = "active";
    },false,10);
    emitter.addListener('entityPreUpdateUser',async (conn,user) => {
      let old = await new User({id:user.id}).load(conn);
      if(user.password){
        user.salt = CryptUtils.randomString(10);
        user.password = CryptUtils.hash(user.salt,user.password);
      }else{
        user.salt = old.salt;
        user.password = old.password;
      }
    },true);
  }

  checkPassword(password){
    let shadow = CryptUtils.hash(this.salt,password);
    return this.password===shadow && this.status==='active';
  }

  static addMiddleware(app){
    app.use(
      [
        async (req, res, next) => {
          let token = req.body.token || req.query.token || (req.headers.authorization?req.headers.authorization.substring(7):null);
          if(token==null)
            return next();
          let user = await User.runSelect(res.locals.conn,`
            SELECT user.* FROM user
            LEFT JOIN token ON token.user_id = user.id
            WHERE token.token = ? AND CURRENT_TIMESTAMP<expiration;
          `,token);
          if(user.length==0)
            return next(401);
          res.locals.user = await user[0].load(res.locals.conn);
          return next();
        },
        async (req, res, next) => {
          if(res.locals.user==null){
            res.locals.user = await new User({id: vars["guest"]}).load(res.locals.conn);
          }
          return next();
        }
      ]
    );
  }
  static test(request){require("./test.js").TestUser.runTests(request)}
}

User.router.post("/auth", async (req, res, next) => {
  try{
    let user = await User.search(res.locals.conn,{login:req.body.login,email:req.body.login},0,1,false,'OR');
    if(user.length==0)
      return next(401);
    user = user[0];
    if(!user.checkPassword(req.body.password))
      return next(401);
    res.json(await Token.createToken(res.locals.conn,user.id));
    next();
  }catch(e){next(e)}
});

// User.router.get("/tokens", async (req, res, next) => {
//   try{
//     let es = await Token.search(res.locals.conn,{userId:res.locals.user.id},0,1000);
//     es.forEach(async e => {await e.prepare(res.locals.conn)});
//     res.json(es);
//   }catch(e){next(e)}
// });

class Token extends Base({_restify:true,_emitter:emitter,_table:'token',_columns:[
  {name:'id',type:'INT(11)',primaryKey:true,autoIncrement:true},
  {name:'user_id',type:'INT(11)',foreignKey:{references:'user(id)',onDelete:'CASCADE',onUpdate:'CASCADE'}},
  {name:'token',type:'VARCHAR(255)',constraint:'UNIQUE'},
  {name:'date',type:'DATETIME'},
  {name:'expiration',type:'DATETIME'}
]}){
  static createToken(conn,userId,days=7){
    return new Token({
      userId:userId,
      token:CryptUtils.hash(CryptUtils.randomString(10) , CryptUtils.randomString(40)+userId+Date.now() ),
      date:Token.now(),
      expiration:Token.timestampToLocalDatetime(Date.now()+days*24*60*60*1000)
    }).save(conn);
  }
}

module.exports = {User,Token};
