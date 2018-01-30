'use strict';
const proxyquire = require('proxyquire'),
  rpStub = require('../../fixtures/gitlab.stub');

require('should');

describe('GitLab', () => {
  let gitlab;

  before(() => {
    const GitLab = proxyquire('../../../lib/plugins/gitlab', { 'request-promise': rpStub });
    gitlab = new GitLab({url: 'https://gitlab.localhost', token: '12345'});
  });

  afterEach(() => {
    rpStub.spy.resetHistory();
  });

  describe('#getProject', () => {
    it('should fetch projects by group/project name', () => {
      return gitlab.getProject('a', 'b')
        .then(project => {
          project.id.should.eql(3);
          rpStub.spy.args[0][0].should.eql({uri: '/api/v4/projects/a%2Fb'});
        });
    });
  });

  describe('#getVariables', () => {
    it('should fetch build variables for a project by id', () => {
      return gitlab.getVariables(3)
        .then(variables => {
          variables.length.should.eql(4);
          rpStub.spy.args[0][0].should.eql({uri: '/api/v4/projects/3/variables'});
          variables[0].key.should.eql('TEST_VARIABLE_1');
        });
    });
  });

  describe('#createKey', () => {
    it('should POST key id and key to build variables', () => {
      return gitlab.createKey(3, {AccessKeyId: 'AKIALKWEJF3example', SecretAccessKey: 'lkeWEFJ98rexample'})
        .then(() => {
          rpStub.spy.callCount.should.eql(2);
          const [requestOne, requestTwo] = rpStub.spy.args;
          requestOne[0].method.should.eql('POST');
          requestOne[0].uri.should.eql('/api/v4/projects/3/variables');
          requestOne[0].body.key.should.eql('AWS_ACCESS_KEY_ID');
          requestTwo[0].method.should.eql('POST');
          requestTwo[0].uri.should.eql('/api/v4/projects/3/variables');
          requestTwo[0].body.key.should.eql('AWS_SECRET_ACCESS_KEY');
        });
    });
  });

  describe('#updateKey', () => {
    it('should PUT key id and key to build variables', () => {
      return gitlab.updateKey(3, {AccessKeyId: 'AKIALKWEJF3example', SecretAccessKey: 'lkeWEFJ98rexample'})
        .then(() => {
          rpStub.spy.callCount.should.eql(2);
          const [requestOne, requestTwo] = rpStub.spy.args;
          requestOne[0].method.should.eql('PUT');
          requestOne[0].body.key.should.eql('AWS_ACCESS_KEY_ID');
          requestOne[0].uri.should.eql('/api/v4/projects/3/variables/AWS_ACCESS_KEY_ID');
          requestTwo[0].method.should.eql('PUT');
          requestTwo[0].body.key.should.eql('AWS_SECRET_ACCESS_KEY');
        });
    });
  });

  describe('#createOrUpdateKey', () => {
    it('should update key if it already exists', () => {
      return gitlab.createOrUpdateKey('/service/gitlab/a/b', {AccessKeyId: 'AKIALKWEJF3example', SecretAccessKey: 'lkeWEFJ98rexample'})
        .then(() => {
          rpStub.spy.callCount.should.eql(4);
          const [getProject, getVars, putId, putKey] = rpStub.spy.args;
          getProject[0].uri.should.eql('/api/v4/projects/a%2Fb');
          getVars[0].uri.should.eql('/api/v4/projects/3/variables');
          putId[0].method.should.eql('PUT');
          putKey[0].method.should.eql('PUT');
        });
    });
  });

  describe('#checkForActiveKey', () => {
    it('should fail if key has different id than the variable', () => {
      return gitlab.checkForActiveKey('/service/gitlab/a/b', 'AKIAthisiswrong')
        .then(() => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('Key found in service not same as active key!');
        });
    });

    it('should success if key has sam id as the variable', () => {
      return gitlab.checkForActiveKey('/service/gitlab/a/b', 'Something')
        .then(key => {
          key.AWS_ACCESS_KEY_ID.should.eql('Something');
        });
    });
  });
});
