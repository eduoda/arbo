const mysql = require('mysql');

class MySQL{
  constructor(){
  }
  setOptions(options){
    this.pool =  mysql.createPool(options);
  }
  getConn(){
    return new Promise((resolve, reject) => {
      this.pool.getConnection(function(err,conn) {
        if(err) reject(err);
        resolve(conn);
      });
    });
  }
  mw(){
    return async (req,res,next) =>{
      let conn = await this.getConn();
      // res.on('finish', () => {conn.release()});
      res.locals.conn = conn;
      return next();
    }
  }
}

module.exports = {MySQL};
