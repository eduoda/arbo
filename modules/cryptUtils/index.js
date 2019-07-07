const crypto = require('crypto');

// Helper functions
function hash(salt,msg,enc='base64'){
  return crypto.createHash('sha256',salt).update(msg).digest(enc);
}
function randomString(len){
  return crypto.randomBytes(1+len*3/4).toString('base64').slice(0,len);
}

module.exports = {hash,randomString}