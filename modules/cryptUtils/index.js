const crypto = require('crypto');

// Helper functions
function hash(salt,msg,enc='base64'){
  return (salt && msg) ? crypto.createHmac('sha256',salt).update(msg).digest(enc).replace(/\+/g,".").replace(/\//g,"_").replace(/=/g,"-") : null;
}
function randomString(len){
  return crypto.randomBytes(1+len).toString('base64').slice(0,len).replace(/\+/g,".").replace(/\//g,"_").replace(/=/g,"-");
}

module.exports = {hash,randomString}
