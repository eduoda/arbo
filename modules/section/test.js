var assert = require('assert');

class TestSection{
  static runTests(request){
    describe('Section tests', function() {
      let section;
      describe('POST /Section', function() {
        it('should create some sections', async () => {
          try{
            section = (await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:1,name:"Section 1.1"}).expect(200)).body;
            await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:1,name:"Section 1.2"}).expect(200) //3
            await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:2,name:"Section 1.1.1"}).expect(200)
            await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:2,name:"Section 1.1.2"}).expect(200) //5
            await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:3,name:"Section 1.2.1"}).expect(200)
            await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:3,name:"Section 1.2.2"}).expect(200)
            await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:5,name:"Section 1.1.2.1"}).expect(200)
            await request.post('/Section').set('Authorization', 'bearer ' + request.data.adminToken).send({sectionId:5,name:"Section 1.1.2.1"}).expect(200)
          }catch(e){
          }
        });
      });

      describe('GET /Section/1', function() {
        it('should get 1 section', (done) => {
          request
            .get('/Section/1')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .expect(200)
            .then(res => {
              console.log(res.body)
              assert.equal(res.body.name,"Section 1");
              done();
            }).catch(done);
        });
      });

      describe('GET /Section', function() {
        it('should get 1 section', (done) => {
          request
            .get('/Section/'+section.id)
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .expect(200)
            .then(res => {
              console.log(res.body)
              assert.equal(res.body.name,"Section 1.1");
              done();
            }).catch(done);
        });
      });

      describe('PUT /Section', function() {
        it('should update a section', (done) => {
          request
            .put('/Section')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .send({
              id:1,
              name:"Section 1."
            })
            .expect(200)
            .then(res => {
              console.log(res.body)
              assert(res.body.name=="Section 1.");
              done();
            }).catch(done);
        });
      });

      describe('PUT /Section', function() {
        it('should update a section', (done) => {
          request
            .put('/Section')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .send({
              id:section.id,
              sectionId:1,
              name:"new name"
            })
            .expect(200)
            .then(res => {
              console.log(res.body)
              assert(res.body.name=="new name");
              done();
            }).catch(done);
        });
      });

      describe('DELETE /Section', function() {
        it('should delete a section', (done) => {
          request
            .delete('/Section/'+section.id)
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .expect(200)
            .then(res => {
              console.log(res.body)
              done();
            }).catch(done);
        });
      });

    });
  }
}

class TestMembership{
  static runTests(request){
    describe('Membership tests', function() {
      let membership;
      describe('POST /Membership', function() {
        it('should create new sub membership', (done) => {
          request
            .post('/Membership')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .send({
              sectionId:1,
              userId:request.data.user.id,
              status:"active",
            })
            .expect(200)
            .then(res => {
              console.log(res.body)
              assert(res.body.hasOwnProperty('id'));
              membership = res.body;
              done();
            }).catch(done);
        });
      });

      describe('GET /Membership/2', function() {
        it('should get 1 section', (done) => {
          request
            .get('/Membership/'+membership.id)
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .expect(200)
            .then(res => {
              console.log(res.body)
              assert.equal(res.body.id,membership.id);
              done();
            }).catch(done);
        });
      });

      describe('GET /Membership/Section/1', function() {
        it('should get two memberships', (done) => {
          request
            .get('/Membership/Section/1')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .expect(200)
            .then(res => {
              console.log(res.body);
              assert.equal(res.body.length,3);
              done();
            }).catch(done);
        });
      });

      describe('PUT /Membership', function() {
        it('should update a membership', (done) => {
          request
            .put('/Membership')
            .set('Authorization', 'bearer ' + request.data.adminToken)
            .send({
              id:membership.id,
              sectionId:request.data.section.id
            })
            .expect(200)
            .then(res => {
              console.log(res.body)
              // assert(res.body.name=="Section 1.");
              done();
            }).catch(done);
        });
      });

      // describe('DELETE /Membership', function() {
      //   it('should delete a membership', (done) => {
      //     request
      //       .delete('/Membership/'+membership.id)
      //       .set('Authorization', 'bearer ' + request.data.adminToken)
      //       .expect(200)
      //       .then(res => {
      //         console.log(res.body)
      //         done();
      //       }).catch(done);
      //   });
      // });

    });
  }
}
module.exports = {TestSection,TestMembership}
