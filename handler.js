'use strict';

const metafig = require('@cimpresscloud/metafig'),
  Iam = require('./lib/aws'),
  Aws = require('aws-sdk'),
  felix = require('./lib/felix');

function publishReports (reports, topicArn) {
  const sns = new Aws.SNS();

  let status = 'Success';
  if (reports.some(r => r.status === 'error')) {
    status = 'Errors';
  }

  return new Promise((resolve, reject) => {
    var params = {
      Message: JSON.stringify({
        default: `
Felix attempted to rotate ${reports.length} keys at ${new Date()}!

For each successfully-rotated user listed below, new keys have been created
and updated on the configured services. Old keys have been deactivated.

Failed rotations listed below are in an unknown state and may require manual
intervention. If you discover a problem, manually re-enable the key in question.

Deactivated keys will be deleted in the next Felix run.

Verbose report below:

${JSON.stringify(reports, null, 3)}`.trim()
      }),
      MessageStructure: 'json',
      Subject: `[${status}] Felix rotated ${reports.length} keys at ${new Date()}!`,
      TopicArn: topicArn
    };
    sns.publish(params, function (err, data) {
      if (err) reject(err, err.stack);
      else resolve(data);
    });
  });
}

module.exports.rotate = (event, context, callback) => {
  let config = {}, iam = {};
  metafig(require('./config.json'))
    .then(conf => {
      config = conf;
      iam = new Iam();
      return iam.getUsers(config.plugins.aws.userPath);
    })
    .then((users) => {
      return Promise.all(users.map(u => { return felix.rotateKeyForUser(u, config); }));
    })
    .then(reports => {
      return publishReports(reports, config.plugins.aws.snsTopic);
    })
    .then(console.log)
    .catch(console.error);
};
