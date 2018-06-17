'use strict';
const request = require('request-promise');

class TravisClient {
  /**
   * Make requests of the SumoLogic API
   * @param {{token: string}} settings - Connection settings for the Sumologic API
   */
  constructor (settings) {
    this.client = request.defaults({
      baseUrl: 'https://api.travis-ci.org',
      headers: {
        'Content-Type': 'application/json',
        'Travis-API-Version': '3',
        'Authorization': `token ${settings.token}`
      },
      json: true
    });
  }

  getVariables (org, repo) {
    const namespace = encodeURIComponent(`${org}/${repo}`);
    return this.client({
      uri: `/repo/${namespace}/env_vars`
    })
      .then(resp => {
        return resp.env_vars;
      });
  }

  updateVariable (org, repo, variable) {
    const namespace = encodeURIComponent(`${org}/${repo}`);
    return this.client({
      method: 'PATCH',
      uri: `/repo/${namespace}/env_var/${variable.id}`,
      body: {
        'env_var.name': variable.name,
        'env_var.value': variable.value,
        'env_var.public': variable.public
      }
    });
  }

  createVariable (org, repo, variable) {
    const namespace = encodeURIComponent(`${org}/${repo}`);
    return this.client({
      method: 'POST',
      uri: `/repo/${namespace}/env_vars`,
      body: {
        'env_var.name': variable.name,
        'env_var.value': variable.value,
        'env_var.public': variable.public
      }
    });
  }

  createOrUpdateVariable (org, repo, variable) {
    return this.getVariables(org, repo)
      .then(variables => {
        const existingVar = variables.filter(v => v.name === variable.name);
        if (existingVar && existingVar.length > 0) {
          variable.id = existingVar[0].id;
          return this.updateVariable(org, repo, variable);
        } else {
          return this.createVariable(org, repo, variable);
        }
      });
  }

  checkForActiveKey (metadata, keyId) {
    const [,,, org, repo] = metadata.split('/');

    return this.getVariables(org, repo)
      .then(variables => {
        const usedKeyId = variables.filter(v => v.name === 'AWS_ACCESS_KEY_ID');
        if (usedKeyId.length === 0 || (usedKeyId[0].value === keyId)) {
          return true;
        } else {
          throw new Error('The active key does not match the one used by the service!');
        }
      });
  }

  createOrUpdateKey (metadata, key) {
    const [,,, org, repo] = metadata.split('/');

    let corrections = [];
    corrections.push(this.createOrUpdateVariable(org, repo, {
      name: 'AWS_ACCESS_KEY_ID',
      value: key.AccessKeyId,
      public: true
    }));

    corrections.push(this.createOrUpdateVariable(org, repo, {
      name: 'AWS_SECRET_ACCESS_KEY',
      value: key.SecretAccessKey,
      public: false
    }));

    return Promise.all(corrections);
  }
}

module.exports = TravisClient;
