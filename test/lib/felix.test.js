'use strict';
// const proxyquire = require('proxyquire'),
//   gitlabStub = require('../fixtures/gitlab-plugin.stub'),
//   felix =  proxyquire('../../lib/felix', { './lib/plugins/gitlab': gitlabStub });
const felix = require('../../lib/felix');

require('should');

describe('felix', () => {
  describe('#loadPlugin', () => {
    it('should fail to load plugin with no configuration', () => {
      return felix.loadPlugin('gitlab', {})
        .then(plugin => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('Plugin gitlab has no configuration!');
        });
    });

    it("should fail to load plugins that don't exist", () => {
      return felix.loadPlugin('foobar', {plugins: {foobar: {}}})
        .then(plugin => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('Unable to find requested plugin foobar.');
        });
    });

    it('should successfully load existing plugins', () => {
      return felix.loadPlugin('gitlab', {plugins: {gitlab: {}}})
        .then(plugin => {
          const GitLab = require('../../lib/plugins/gitlab');
          plugin.should.be.an.instanceOf(GitLab);
        });
    });
  });

  describe('#checkKeyState', () => {
    it('should fail if there are multiple active keys', () => {
      try {
        felix.checkKeyState([
          { AccessKeyId: 'AKIAEXAMPLE12345',
            Status: 'Active',
            SecretAccessKey: 'kljf234fuexample' },
          { AccessKeyId: 'AKIAEXAMPLE98765',
            Status: 'Active',
            SecretAccessKey: 'jkh4lj3example' }
        ]);
      } catch (err) {
        err.should.be.an.Error();
        err.message.should.eql('User has multiple active keys! Skipping...');
        return;
      }

      throw new Error("This shouldn't have succeeded");
    });

    it('should return the key if there is a single active key', () => {
      const inputKeys = [
        { AccessKeyId: 'AKIAEXAMPLE12345',
          Status: 'Active',
          SecretAccessKey: 'kljf234fuexample' }
      ];
      const outputKeys = felix.checkKeyState(inputKeys);
      outputKeys.should.be.eql(inputKeys[0]);
    });

    it('should disregard inactive keys', () => {
      const inputKeys = [
        { AccessKeyId: 'AKIAEXAMPLE12345',
          Status: 'Active',
          SecretAccessKey: 'kljf234fuexample' },
        { AccessKeyId: 'AKIAEXAMPLE98765',
          Status: 'Inactive',
          SecretAccessKey: 'jkh4lj3example' }
      ];

      const outputKeys = felix.checkKeyState(inputKeys);
      outputKeys.should.be.eql(inputKeys[0]);
    });

    it('should be okay with no keys at all', () => {
      const inputKeys = [
        { AccessKeyId: 'AKIAEXAMPLE98765',
          Status: 'Inactive',
          SecretAccessKey: 'jkh4lj3example' }
      ];

      const outputKeys = felix.checkKeyState(inputKeys);
      outputKeys.should.be.eql({});
    });
  });

  describe('#parseMetadata', () => {
    it('should parse service and metadata from a user', () => {
      let result = felix.parseMetadata({
        Path: '/gitlab/cloud/', UserName: 'felix@gitlab'
      });

      result.service.should.eql('cloud');
      result.metadata.should.eql('/gitlab/cloud/felix@gitlab');
    });
  });
});
