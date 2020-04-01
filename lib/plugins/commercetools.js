const request = require('request-promise');
class Commercetools {
  /**
   *Creates an instance of Commercetools.
   * @param {{clientId: string, clientSecret: string, oauthHost: string, apiHost: string }} settings
   * @memberof Commercetools
   */
  constructor (settings) {
    this.settings = settings;
    this.authUrl = settings.oauthHost.replace(/\/$/, '') + '/oauth/token';

    this.client = request.defaults({
      baseUrl: settings.apiHost,
      headers: {
        'Content-Type': 'application/json'
      },
      json: true
    });
  }

  /**
   * Get bearer token from to authenticate further connections
   * @param {string} projectKey
   */
  authenticate (projectKey) {
    const scope = 'manage_subscriptions:' + projectKey;
    var options = {
      method: 'POST',
      uri: this.authUrl,
      auth: {
        user: this.settings.clientId,
        password: this.settings.clientSecret
      },
      qs: {
        grant_type: 'client_credentials',
        scope: scope
      },
      useQuerystring: true,
      json: true
    };
    return request(options)
      .then(res => {
        const accessToken = res.access_token;
        this.client = this.client.defaults({
          auth: {
            bearer: accessToken
          }
        });
        this.authenticated = true;
      });
  }

  /**
   * update the subscription
   * @param {string} projectKey
   * @param {string} subscriptionKey
   * @param {{projectKey: string, subscriptionKey: string, version: int, destination: destination}} subscription
   */
  updateSubscription (projectKey, subscriptionKey, subscription) {
    // wait for aws to enable the key
    return new Promise(resolve => {
      setTimeout(resolve, 12000);
    })
      .then(() => this.client({
        uri: `/${projectKey}/subscriptions/key=${subscriptionKey}`,
        method: 'POST',
        body: subscription
      })
      );
  }

  /**
   * get the current subscription details from Ctools
   * @param {*} metadata
   */
  getSubscription (metadata) {
    if (this.subscription) {
      return new Promise((resolve, reject) => resolve(this.subscription));
    }

    const [,,, projectKey, subscriptionKey] = metadata.split('/');

    // get bearertoken
    return this.authenticate(projectKey)
      .then(() => this.client({
        uri: `/${projectKey}/subscriptions/key=${subscriptionKey}`,
        method: 'GET'
      }))
      .then(response => {
        this.subscription = {
          projectKey: projectKey,
          subscriptionId: subscriptionKey,
          version: response.version,
          destination: response.destination
        };
        return this.subscription;
      });
  }

  createOrUpdateKey (metadata, key) {
    return this.getSubscription(metadata)
      .then(subscription => {
        subscription.destination.accessKey = key.AccessKeyId;
        subscription.destination.accessSecret = key.SecretAccessKey;

        const updateBody = {
          version: subscription.version,
          actions: [
            {
              action: 'changeDestination',
              destination: subscription.destination
            }
          ]
        };
        return this.updateSubscription(
          subscription.projectKey,
          subscription.subscriptionId,
          updateBody
        );
      });
  }

  checkForActiveKey (metadata, keyId) {
    return this.getSubscription(metadata)
      .then(subscription => {
        let subscriptionKey;
        try {
          subscriptionKey = subscription.destination.accessKey;
        } catch (error) {
          throw new Error('Could not find AWS keys in subscription');
        }
        if (keyId !== subscriptionKey) {
          throw new Error('Key found in service not same as active key!');
        } else {
          return true;
        }
      });
  }
}

module.exports = Commercetools;
