const crypto = require('crypto');

// Helper functions
function hash(salt,msg,enc='base64'){
  return crypto.createHash('sha256',salt).update(msg).digest(enc).replace("+",".").replace("/","_").replace("=","-");
}
function randomString(len){
  return crypto.randomBytes(1+len).toString('base64').slice(0,len).replace("+",".").replace("/","_").replace("=","-");
}

module.exports = {hash,randomString}
