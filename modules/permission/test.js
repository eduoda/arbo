var assert = require('assert');

class TestRole{
  static runTests(request){
    describe('POST /Role', function() {
      it('should reate and return new role', (done) => {
        request
          .post('/Role')
          .set('Authorization', 'bearer ' + request.data.adminToken)
          .send({
            name:"new roles"
          })
          .expect(200)
          .then(res => {
            assert(res.body.hasOwnProperty('id'));
            request.data.newRoleId = res.body.id;
            done();
          }).catch(done);
      });
    });

    describe('Get /Role', function() {
      it('should return list of roles', (done) => {
        request
          .get('/Role')
          .set('Authorization', 'bearer ' + request.data.adminToken)
          .expect(200)
          .then(res => {
            assert(res.body.length>0);
            done();
          }).catch(done);
      });
    });

    describe('Put /Role', function() {
      it('should update a roles', (done) => {
        request
          .put('/Role')
          .set('Authorization', 'bearer ' + request.data.adminToken)
          .send({
            id:request.data.newRoleId,
            name:"new roles updated"
          })
          .expect(200)
          .then(res => {
            assert(res.body.name==="new roles updated");
            done();
          }).catch(done);
      });
    });

    describe('Delete /Role', function() {
      it('should update a roles', (done) => {
        request
          .delete('/Role/'+request.data.newRoleId)
          .set('Authorization', 'bearer ' + request.data.adminToken)
          .expect(200)
          .then(res => {
            console.log(res.body)
            assert(res.body.hasOwnProperty('id'));
            done();
          }).catch(done);
      });
    });
  }
}
class TestRolePermission{
  static runTests(request){
    describe('POST /RolePermission', function() {
      it('should create and return new role permission', (done) => {
        request
          .post('/RolePermission/2')
          .set('Authorization', 'bearer ' + request.data.adminToken)
          .send({
            roleId:2,
            permissionId:14
          })
          .expect(200)
          .then(res => {
            assert(res.body.hasOwnProperty('id'));
            console.log(res.body)
            done();
          }).catch(done);
      });
    });
  }
}

module.exports = {TestRole,TestRolePermission}