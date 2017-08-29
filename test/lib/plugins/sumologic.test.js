'use strict';

const sepia = require('sepia'),
  path = require('path');

sepia.fixtureDir(path.join(process.cwd(), 'test/fixtures/sepia-fixtures'));
sepia.configure({
  includeHeaderNames: false,
  includeCookieNames: false
});

require('should');

describe('SumoLogic', function () {
  if (process.env.VCR_MODE === 'record') this.timeout(15000);

  const SumoLogic = require('../../../lib/plugins/sumologic');
  let sumologic;

  beforeEach(() => {
    let sumoKeyId = 'fake',
      sumoSecretKey = 'fake';

    if (process.env.VCR_MODE === 'record') {
      sumoKeyId = process.env.SUMO_KEY_ID;
      sumoSecretKey = process.env.SUMO_SECRET_KEY;
    }

    sumologic = new SumoLogic({ url: 'https://api.us2.sumologic.com/api/v1',
      keyId: sumoKeyId,
      secretKey: sumoSecretKey });
  });

  describe('#getCollector', () => {
    it('should fetch collectors by name', () => {
      return sumologic.getCollector('team-aws-Account')
        .then(collector => {
          collector.name.should.eql('team-aws-Account');
          collector.id.should.eql(102990815);
        });
    });

    it("should throw a friendly error if it can't find a collector", () => {
      return sumologic.getCollector('ThisDoesntExist')
        .then(collector => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql("Couldn't find collector ThisDoesntExist!");
        });
    });

    it("should throw a friendly error if it's not a hosted collector", () => {
      return sumologic.getCollector('my-service-logs')
        .then(collector => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql("Collector my-service-logs doesn't seem to be a Hosted collector!");
        });
    });
  });

  describe('#getSourceForCollector', () => {
    it('should fetch source in collector by name', () => {
      return sumologic.getSourceForCollector(102990815, 'team-aws-cloudtrail')
        .then(source => {
          source.id.should.eql(113351794);
          source.name.should.eql('team-aws-cloudtrail');
        });
    });

    it("should throw a friendly error if it can't find a source", () => {
      return sumologic.getSourceForCollector(102990815, 'ThisDoesntExist')
        .then(collector => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql("Couldn't find source ThisDoesntExist!");
        });
    });

    it("should throw a friendly error if it isn't an AWS source", () => {
      return sumologic.getSourceForCollector(103153168, 'my-service-syslog')
        .then(collector => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql("Source my-service-syslog doesn't seem to require IAM keys.");
        });
    });
  });

  describe('#getSourceConfig', () => {
    it('should fetch source the source config', () => {
      return sumologic.getSourceConfig(102990815, 113351794)
        .then(config => {
          config.etag.should.not.be.empty();
          config.config.source.name.should.eql('team-aws-cloudtrail');
          config.config.source.id.should.eql(113351794);
          config.config.source.contentType.should.startWith('Aws');
        });
    });

    it("should throw a friendly error if it can't get source config", () => {
      return sumologic.getSourceConfig(102990815, 0)
        .then(config => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('The specified source ID is invalid.');
        });
    });
  });

  describe('#findSourceConfig', () => {
    it('should find source config by metadata', () => {
      return sumologic.findSourceConfig('/service/sumologic/team-aws-Account/team-aws-cloudtrail')
        .then(config => {
          config.collectorId.should.eql(102990815);
          config.sourceId.should.eql(113351794);
          config.config.source.name.should.eql('team-aws-cloudtrail');
        });
    });

    it("should throw a friendly error if the collector doesn't exist", () => {
      return sumologic.findSourceConfig('/service/sumologic/ThisDoesntExist/team-aws-cloudtrail')
        .then(config => {
          throw new Error("This shouldn't happen!");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql("Couldn't find collector ThisDoesntExist!");
        });
    });

    it("should throw a friendly error if the source doesn't exist", () => {
      return sumologic.findSourceConfig('/service/sumologic/team-aws-Account/ThisDoesntExist')
        .then(config => {
          throw new Error("This shouldn't happen!");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql("Couldn't find source ThisDoesntExist!");
        });
    });
  });

  describe('#checkForActiveKey', () => {
    it('should succeed if the key is found', () => {
      return sumologic.checkForActiveKey('/service/sumologic/team-aws-Account/team-aws-cloudtrail', 'AKIAIVO7QLOLDEXAMPLE')
        .then(result => {
          result.should.eql(true);
        });
    });

    it('should fail if the key is different', () => {
      return sumologic.checkForActiveKey('/service/sumologic/team-aws-Account/team-aws-cloudtrail', 'AKIAJFL2KJFEXAMPLE')
        .then(result => {
          throw new Error("This shouldn't happen");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql('Key found in service not same as active key!');
        });
    });

    it('should fail if there are no keys in the source', () => {
      return sumologic.checkForActiveKey('/service/sumologic/my-service-logs/my-service-syslog', 'AKIAIVO7QLOLDEXAMPLE')
        .then(result => {
          throw new Error("This shouldn't happen.");
        })
        .catch(err => {
          err.should.be.an.Error();
          err.message.should.eql("Collector my-service-logs doesn't seem to be a Hosted collector!");
        });
    });
  });
});
