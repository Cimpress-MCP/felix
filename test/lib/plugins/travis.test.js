'use strict';

// TODO: These tests are pretty gross. I developed them against the Travis API,
//       but that means they are super stateful. Specifically, ordering matters.
//       These should be re-written to be proper unit tests instead of integration
//       tests where the web requests are stubbed.

const sepia = require('sepia'),
  path = require('path');

sepia.fixtureDir(path.join(process.cwd(), 'test/fixtures/sepia-fixtures'));
sepia.configure({
  includeHeaderNames: false,
  includeCookieNames: false
});

require('should');

describe('TravisCi', function () {
  if (process.env.VCR_MODE === 'record') this.timeout(15000);

  let travis;

  before(() => {
    const Travis = require('../../../lib/plugins/travis');
    let travisKey = 'fake key';

    if (process.env.VCR_MODE === 'record') {
      travisKey = process.env.TRAVIS_KEY;
    }

    travis = new Travis({token: travisKey});
  });

  describe('#getVariables', () => {
    it('should return variables for a repo', () => {
      return travis.getVariables('maclennann', 'rake-terraform')
        .then(variables => {
          variables.should.be.an.Array();
          variables.filter(v => v.name === 'AWS_ACCESS_KEY_ID')[0].value.should.eql('AKIAlolololololol');
          variables.filter(v => v.name === 'AWS_SECRET_ACCESS_KEY')[0].should.not.have.property('value');
        });
    });

    it("should error if the repo doesn't exist", () => {
      return travis.getVariables('maclennann', 'lol-not-real')
        .then(variables => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.error.error_type.should.eql('not_found');
        });
    });
  });

  describe('#checkForActiveKey', () => {
    it('should return true if the queried key matches the one in use', () => {
      return travis.checkForActiveKey('/service/travis/maclennann/rake-terraform', 'AKIAlolololololol')
        .then(result => {
          result.should.be.eql(true);
        });
    });

    it('should return true if there is no key in use', () => {
      return travis.checkForActiveKey('/service/travis/maclennann/hubot-chartroom', 'AKIAlolololololol')
        .then(result => {
          result.should.be.eql(true);
        });
    });

    it('should fail if key is different', () => {
      return travis.checkForActiveKey('/service/travis/maclennann/rake-terraform', 'AKIAwrong')
        .then(result => {
          throw new Error("This shouldn't happen");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('The active key does not match the one used by the service!');
        });
    });
  });

  describe('#updateVariable', () => {
    it('should update an existing variable, given a valid id', () => {
      return travis.updateVariable('maclennann', 'rake-terraform', {
        id: 'c9114be0-951c-45d1-b859-2675c5d9efe6',
        name: 'AWS_ACCESS_KEY_ID',
        value: 'AKIAlolololololol',
        public: true
      })
        .then(update => {
          update.id.should.eql('c9114be0-951c-45d1-b859-2675c5d9efe6');
          update.value.should.eql('AKIAlolololololol');
        });
    });
  });

  describe('#createVariable', () => {
    it("should create a variable that doesn't exist", () => {
      return travis.createVariable('maclennann', 'rake-terraform', {
        name: 'A_NEW_VARIABLE',
        value: 'a variable value',
        public: true
      })
        .then(creation => {
          creation.value.should.eql('a variable value');
          creation.should.have.property('id');
        });
    });
  });

  describe('#createOrUpdateKey', () => {
    it('should update keys that already exist', () => {
      return travis.createOrUpdateKey('/service/travis/maclennann/rake-terraform', {
        AccessKeyId: 'AKIAlolololololol',
        SecretAccessKey: 'this is a secret'
      })
        .then(updates => {
          let id = updates.filter(u => u.name === 'AWS_ACCESS_KEY_ID')[0],
            key = updates.filter(u => u.name === 'AWS_SECRET_ACCESS_KEY')[0];

          id.id.should.eql('c9114be0-951c-45d1-b859-2675c5d9efe6');
          key.id.should.eql('880dfc38-9fe4-4d53-919b-44771afc5a0d');
        });
    });
  });

  describe('#createOrUpdateVariable', () => {
    it('should update variable that already exists', () => {
      return travis.createOrUpdateVariable('maclennann', 'rake-terraform', {
        name: 'AWS_ACCESS_KEY_ID',
        value: 'AKIAlolololololol',
        public: true
      })
        .then(update => {
          update.id.should.eql('c9114be0-951c-45d1-b859-2675c5d9efe6');
          update.value.should.eql('AKIAlolololololol');
        });
    });

    it('should create variable that does not exist', () => {
      return travis.createOrUpdateVariable('maclennann', 'rake-terraform', {
        name: 'A_NEW_VARIABLE_TWO',
        value: 'this is a variable',
        public: true
      })
        .then(create => {
          create.should.have.property('id');
          create.value.should.eql('this is a variable');
        });
    });
  });
});
