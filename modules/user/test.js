var assert = require('assert');

class TestUser{
  static runTests(request){
    describe('User tests', function() {
      describe('POST /User/auth', function() {
        it('should return 401 for wrong password ', (done) => {
          request
            .post('/User/auth')
            .send({
              login:"root",
              password:"wrong password"
            })
            .expect(401,done);
        });
      });

      describe('POST /User/auth', function() {
        it('should return return new token', (done) => {
          request
            .post('/User/auth')
            .send({
              login:"root",
              password:"root"
            })
            .expect(200)
            .then(res => {
              assert(res.body.hasOwnProperty('token'));
              request.data.adminToken = res.body.token;
              done();
            }).catch(done);
        });
      });

      describe('POST /User', function() {
        it('should create new user', (done) => {
          request
            .post('/User')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .send({
              login:"user",
              password:"user",
              email:"user@email.com",
            })
            .expect(200)
            .then(res => {
              assert(res.body.hasOwnProperty('id'));
              done();
            }).catch(done);
        });
      });

      let user;
      describe('GET /User', function() {
        it('should get 3 users', (done) => {
          request
            .get('/User')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .expect(200)
            .then(res => {
              assert.equal(res.body.length,3);
              user = res.body[2];
              done();
            }).catch(done);
        });
      });

      describe('GET /User', function() {
        it('should get a user', (done) => {
          request
            .get('/User/'+user.id)
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .expect(200)
            .then(res => {
              assert.equal(res.body.login,"user");
              request.data.user = res.body;
              done();
            }).catch(done);
        });
      });

    });



    // describe('PUT /User', function() {
    //   it('should update a user', (done) => {
    //     request
    //       .put('/User')
    //       .set('Authorization', 'bearer ' + request.data.adminToken)
    //       .send({
    //         id:user.id,
    //         email:"newuser@email.com"
    //        })
    //       .expect(200)
    //       .then(res => {
    //         console.log(res.body)
    //         assert.equal(res.body.email,"newuser@email.com");
    //         done();
    //       }).catch(done);
    //   });
    // });

    // describe('DELETE /User', function() {
    //   it('should delete a user', (done) => {
    //     request
    //       .delete('/User/'+user.id)
    //       .set('Authorization', 'bearer ' + request.data.adminToken)
    //       .expect(200)
    //       .then(res => {
    //         console.log(res.body)
    //         done();
    //       }).catch(done);
    //   });
    // });

    // describe('POST /User', function() {
    //   it('should create new user for later tests', (done) => {
    //     request
    //       .post('/User')
    //       .set('Authorization', 'bearer ' + request.data.adminToken)
    //       .send({
    //         login:"user",
    //         password:"user",
    //         email:"user@email.com",
    //        })
    //       .expect(200)
    //       .then(res => {
    //         assert(res.body.hasOwnProperty('id'));
    //         request.data.user = res.body;
    //         done();
    //       }).catch(done);
    //   });
    // });


  }
}

module.exports = {TestUser}
