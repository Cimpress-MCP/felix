'use strict';
const AWS = require('aws-sdk');

class AwsClient {
  constructor () {
    this.iam = new AWS.IAM();
  }

  /**
   * Get a list of IAM users in a give path.
   * @param {string} pathPrefix - The path of the IAM users
   * @returns {Promise<AWS.IAM.User[]>} An array of users within that path
   */
  getUsers (pathPrefix = '/') {
    return new Promise((resolve, reject) => {
      this.iam.listUsers({
        PathPrefix: pathPrefix
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data.Users);
      });
    });
  }

  /**
   * Generate a new key for a user.
   * @param {string} username - The username for the key
   * @returns {Promise<AWS.IAM.AccessKey>} An object containing `oldkey` and key materia for the new key
   */
  generateKey (username) {
    return new Promise((resolve, reject) => {
      if (!username) {
        return reject(new Error('Please specify a user to create the key for.'));
      }

      this.iam.createAccessKey({
        UserName: username
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data.AccessKey);
      });
    });
  }

  /**
   * Get access keys attached to an IAM user.
   * @param {string} username - The name of the IAM user
   * @returns {Promise<AWS.IAM.AccessKeyMetadata[]>} An array with basic information about keys attached to the user
   */
  getKeysForUser (username) {
    return new Promise((resolve, reject) => {
      if (!username) {
        return reject(new Error('Please specify a user to get the keys for.'));
      }

      this.iam.listAccessKeys({
        UserName: username
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data.AccessKeyMetadata);
      });
    });
  }

  /**
   *
   *
   * @param {string} username
   * @param {AWS.IAM.AccessKey} key
   * @returns
   * @memberof AwsClient
   */
  deactivateKey (username, key) {
    return new Promise((resolve, reject) => {
      if (!username || !key) {
        return reject(new Error('Username and key must both be specified.'));
      }

      this.iam.updateAccessKey({
        AccessKeyId: key.AccessKeyId,
        UserName: username,
        Status: 'Inactive'
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   *
   *
   * @param {string} username
   * @returns
   * @memberof AwsClient
   */
  deleteDeactivatedKeysForUser (username) {
    return this.getKeysForUser(username)
      .then(keys => {
        const disabledKeys = keys.filter(k => k.Status === 'Inactive');
        return Promise.all(disabledKeys.map(k => {
          return new Promise((resolve, reject) => {
            this.iam.deleteAccessKey({
              UserName: username,
              AccessKeyId: k.AccessKeyId
            }, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          });
        }));
      });
  }
}

module.exports = AwsClient;
