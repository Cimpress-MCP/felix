'use strict';
const proxyquire = require('proxyquire'),
  awsStub = require('../fixtures/aws.stub');

require('should');

describe('Aws', () => {
  let iam;

  before(() => {
    const Aws = proxyquire('../../lib/aws', { 'aws-sdk': awsStub });
    iam = new Aws({});
  });

  afterEach(() => {
    Object.keys(awsStub.spies).forEach(spy => {
      awsStub.spies[spy].reset();
    });
  });

  describe('#getUsers', () => {
    it('should get users based on path', () => {
      return iam.getUsers('/service')
        .then(users => {
          users.length.should.eql(2);
          users.filter(u => u.Path.startsWith('/service')).length.should.eql(users.length);
          awsStub.spies.listUsers.args[0][0].should.eql({PathPrefix: '/service'});
          awsStub.spies.listUsers.callCount.should.eql(1);
        });
    });

    it('should default to getting all users', () => {
      return iam.getUsers('/')
        .then(users => {
          users.length.should.eql(3);
          users.filter(u => u.Path.startsWith('/')).length.should.eql(users.length);
          awsStub.spies.listUsers.args[0][0].should.eql({PathPrefix: '/'});
          awsStub.spies.listUsers.callCount.should.eql(1);
        });
    });
  });

  describe('#generateKey', () => {
    it('should return an error if username is not set', () => {
      return iam.generateKey()
        .then(() => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          awsStub.spies.createAccessKey.callCount.should.eql(0);
          err.message.should.eql('Please specify a user to create the key for.');
        });
    });

    it('should call AWS to create new keys', () => {
      return iam.generateKey('aUser')
        .then(key => {
          awsStub.spies.createAccessKey.callCount.should.eql(1);
          awsStub.spies.createAccessKey.args[0][0].should.eql({UserName: 'aUser'});
          key.UserName.should.eql('aUser');
        });
    });
  });

  describe('#getKeysForUser', () => {
    it('should return an error is username is not set', () => {
      return iam.getKeysForUser()
        .then(keys => {
          throw new Error("This shouldn't happen");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('Please specify a user to get the keys for.');
          awsStub.spies.listAccessKeys.callCount.should.eql(0);
        });
    });

    it('should call AWS to fetch keys for user', () => {
      return iam.getKeysForUser('aUser')
        .then(keys => {
          keys.length.should.eql(2);
          awsStub.spies.listAccessKeys.callCount.should.eql(1);
        });
    });
  });

  describe('#deactivateKey', () => {
    it('should return an error if username is not set', () => {
      return iam.deactivateKey()
        .then(keys => {
          throw new Error("This shouldn't happen");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('Username and key must both be specified.');
          awsStub.spies.updateAccessKey.callCount.should.eql(0);
        });
    });

    it('should return an error if key is not set', () => {
      return iam.deactivateKey('aUser')
        .then(keys => {
          throw new Error("This shouldn't happen");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('Username and key must both be specified.');
          awsStub.spies.updateAccessKey.callCount.should.eql(0);
        });
    });

    it('should call AWS to deactivate key', () => {
      return iam.deactivateKey('aUser', {AccessKeyId: 'AKIAWELKFJ38example'})
        .then(() => {
          awsStub.spies.updateAccessKey.callCount.should.eql(1);
          const params = awsStub.spies.updateAccessKey.args[0][0];
          params.UserName.should.eql('aUser');
          params.AccessKeyId.should.eql('AKIAWELKFJ38example');
        });
    });
  });

  describe('#deleteDeactivatedKeysForUser', () => {
    it('should not delete any active keys', () => {
      return iam.deleteDeactivatedKeysForUser('aUser')
        .then(() => {
          awsStub.spies.listAccessKeys.callCount.should.eql(1);
          awsStub.spies.deleteAccessKey.callCount.should.eql(1);

          const params = awsStub.spies.deleteAccessKey.args[0][0];
          params.UserName.should.eql('aUser');
          params.AccessKeyId.should.eql('AKIAEKLFJexample');
        });
    });
  });
});
