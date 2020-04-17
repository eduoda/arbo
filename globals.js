let Fisher = require('fisherjs');
let emitter = new Fisher();
let vars = {};
let permissions = {};
let {Mailer} = require('./mailer');
let mailer = new Mailer();

module.exports = {
  emitter,
  vars,
  permissions,
  mailer
}
