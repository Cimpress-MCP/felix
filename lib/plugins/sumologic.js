'use strict';
const request = require('request-promise'),
  errors = require('request-promise/errors');

class SumoClient {
  /**
   * Make requests of the SumoLogic API
   * @param {{url: string, keyId: string, secretKey: string}} settings - Connection settings for the Sumologic API
   */
  constructor (settings) {
    this.client = request.defaults({
      baseUrl: settings.url,
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        user: settings.keyId,
        pass: settings.secretKey
      },
      json: true
    });
  }

  /**
   * Find a collector with the requested name.
   * @param {string} collectorName - The name of the collector to look for
   * @param {number} offset - Which page of the SumoLogic API to look in for the collector
   * @returns {object} The configuration for the requested collector
   */
  getCollector (collectorName, offset = 0) {
    if (this.collector) {
      return new Promise((resolve, reject) => resolve(this.collector));
    }

    return this.client({
      uri: `/collectors`,
      qs: {
        limit: 300,
        offset
      },
      method: 'GET'
    })
      .then(body => {
        if (body.collectors.length === 0) {
          throw new Error(`Couldn't find collector ${collectorName}!`);
        }

        return body.collectors.find(c => c.name === collectorName);
      })
      .then(collector => {
        if ((!collector || collector.length === 0) && offset > 3300) {
          throw new Error(`Couldn't find collector ${collectorName}!`);
        } else if (!collector) {
          return this.getCollector(collectorName, (offset + 300));
        } else if (collector.collectorType !== 'Hosted') {
          throw new Error(`Collector ${collectorName} doesn't seem to be a Hosted collector!`);
        } else {
          this.collector = collector;
          return collector;
        }
      });
  }

  /**
   * Find all sources configured for a collector.
   * @param {object} collector - The collector configuration, including id
   * @returns {array} An array of source ids inside of this collector
   */
  getSourceForCollector (collectorId, sourceName, offset = 0) {
    return this.client({
      uri: `/collectors/${collectorId}/sources`,
      qs: {
        limit: 300,
        offset
      },
      method: 'GET'
    })
      .then(response => {
        if (response.sources.length === 0) {
          throw new Error(`Couldn't find source ${sourceName}!`);
        }
        return response.sources.find(s => s.name === sourceName);
      })
      .then(source => {
        if ((!source || source.length === 0) && offset > 200) {
          throw new Error(`Couldn't find source ${sourceName}`);
        } else if (!source) {
          return this.getSourceForCollector(collectorId, sourceName, (offset + 300));
        } else if (source && (source.sourceType !== 'Polling' || !source.contentType.startsWith('Aws'))) {
          throw new Error(`Source ${sourceName} doesn't seem to require IAM keys.`);
        } else {
          return source;
        }
      });
  }

  /**
   * Get the current configuration for a source.
   * @param {number} collectorId - The collector id where the source exists
   * @param {number} sourceId - The source id to fetch
   * @returns {object} Contains `config` with the source config and `etag` for the etag to use when updating
   */
  getSourceConfig (collectorId, sourceId) {
    return this.client({
      uri: `/collectors/${collectorId}/sources/${sourceId}`,
      method: 'GET',
      resolveWithFullResponse: true
    })
      .then(response => {
        return {
          // For some reason etag is wrapped in extra quotes for some reason,
          // let's strip them with `JSON.parse`.
          etag: JSON.parse(response.headers.etag),
          config: response.body
        };
      })
      .catch(errors.StatusCodeError, (err) => {
        throw new Error(err.error.message);
      });
  }

  /**
   * PUT an updated source configuration to the SumoLogic API.
   * @param {object} source - An object describing the SumoLogic source configuration
   * @param {string} etag - An etag for the currently-active source config, returned by SumoLogic
   * @returns {object} The newly-active source config (should match `source`)
   */
  putSourceConfig (collectorId, source, etag) {
    return this.client({
      uri: `/collectors/${collectorId}/sources/${source.source.id}`,
      method: 'PUT',
      headers: {
        'If-Match': `"${etag}"`
      },
      body: source
    });
  }

  findSourceConfig (metadata) {
    if (this.sourceConfig) {
      return new Promise((resolve, reject) => resolve(this.sourceConfig));
    }

    const [,,, collectorName, sourceName] = metadata.split('/');
    let collectorId = -1, sourceId = -1;

    return this.getCollector(collectorName)
      .then(collector => {
        collectorId = collector.id;
        return this.getSourceForCollector(collectorId, sourceName);
      })
      .then(source => {
        sourceId = source.id;
        return this.getSourceConfig(collectorId, sourceId);
      })
      .then(sourceConfig => {
        this.sourceConfig = {
          collectorId,
          sourceId,
          config: sourceConfig.config,
          etag: sourceConfig.etag
        };

        return this.sourceConfig;
      });
  }

  checkForActiveKey (metadata, keyId) {
    return this.findSourceConfig(metadata)
      .then(source => {
        let sourceKey;
        try {
          sourceKey = source.config.source.thirdPartyRef.resources[0].authentication.awsId;
        } catch (error) {
          throw new Error('Could not find AWS keys in source');
        }

        if (keyId !== sourceKey) {
          throw new Error('Key found in service not same as active key!');
        } else {
          return true;
        }
      });
  }

  createOrUpdateKey (metadata, key) {
    return this.findSourceConfig(metadata)
      .then(source => {
        source.config.source.thirdPartyRef.resources[0].authentication.awsId = key.AccessKeyId;
        source.config.source.thirdPartyRef.resources[0].authentication.awsKey = key.SecretAccessKey;

        return this.putSourceConfig(source.collectorId, source.config, source.etag);
      });
  }
}

module.exports = SumoClient;
