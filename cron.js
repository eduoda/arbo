class Cron{
  mysql
  nodecron = require('node-cron');

  constructor(){
  }

  schedule(expression, func, options){
    return this.nodecron.schedule(expression, async ()=>{
      let conn = await this.mysql.getConn();
      await func(conn);
      await conn.release();
    }, options);
  }

}

module.exports = {Cron};
