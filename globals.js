let Fisher = require('fisherjs');
let emitter = new Fisher();
let {MySQL} = require('./mysql');
let mysql =  new MySQL();
let vars = {};
let permissions = {};
let {Mailer} = require('./mailer');
let mailer = new Mailer();
let {Cron} = require('./cron');
let cron = new Cron();

module.exports = {
  mysql,
  emitter,
  vars,
  permissions,
  mailer,
  cron
}
