#!/usr/bin/env node

const AWS = require('aws-sdk'),
  readline = require('readline-sync'),
  pathPrefix = '/felix/',
  { ssmToObjByPath } = require('ssm-params');

if (!AWS.config.region) {
  const region = readline.question('Please specify which region to set these parameters in (us-east-1): ', { defaultInput: 'us-east-1' });
  AWS.config.update({ region });
}

const ssm = new AWS.SSM();

const config = [
  {
    Name: 'aws',
    Description: 'AWS-specific settings for locating IAM users and notifying SNS.',
    required: true,
    parameters: [
      {
        Name: 'snsTopic',
        default: `arn:aws:sns:${AWS.config.region}:[account id]:FelixReports`,
        Description: 'The SNS topic to publish Felix reports.',
        Type: 'String'
      },
      {
        Name: 'userPath',
        default: '/service/',
        Description: 'The path preflix to look in for IAM users.',
        Type: 'String'
      }
    ]
  },
  {
    Name: 'gitlab',
    Description: 'Gitlab settings for updating IAM keys used by Pipelines jobs.',
    required: false,
    parameters: [
      {
        Name: 'url',
        default: 'https://gitlab.com',
        Description: 'The base URL for the GitLab API.',
        Type: 'String'
      },
      {
        Name: 'token',
        Description: 'The GitLab API token for managing repository settings.',
        KeyId: 'alias/felix/settings',
        Type: 'SecureString'
      },
      {
        Name: 'protectedKeys',
        default: 'false',
        Description: 'Should GitLab mark the keys as protected? Protected keys can only be used on protected branches. (true or false)',
        Type: 'String'
      }
    ]
  },
  {
    Name: 'sumologic',
    Description: 'SumoLogic settings for updating AWS sources.',
    required: false,
    parameters: [
      {
        Name: 'keyId',
        Description: 'The Id of the SumoLogic Authentication Key',
        KeyId: 'alias/felix/settings',
        Type: 'SecureString'
      },
      {
        Name: 'secretKey',
        Description: 'The SumoLogic Authentication secret Key',
        KeyId: 'alias/felix/settings',
        Type: 'SecureString'
      },
      {
        Name: 'url',
        Description: 'The SumoLogic API endpoint url.',
        default: 'https://api.us2.sumologic.com/api/v1',
        Type: 'String'
      }
    ]
  },
  {
    Name: 'travis',
    Description: 'Travis CI settings for managing repositories.',
    required: false,
    parameters: [
      {
        Name: 'token',
        Description: 'The Travis API token.',
        KeyId: 'alias/felix/settings',
        Type: 'SecureString'
      }
    ]
  },
  {
    Name: 'commercetools',
    Description: 'Commercetools settings for managing subscriptions.',
    required: false,
    parameters: [
      {
        Name: 'oauthHost',
        Description: 'The Commercetools AUTH endpoint.',
        default: 'https://auth.sphere.io',
        Type: 'String'
      },
      {
        Name: 'apiHost',
        Description: 'The Commercetools API endpoint.',
        default: 'https://api.sphere.io',
        Type: 'String'
      },
      {
        Name: 'clientId',
        Description: 'The Commercetools Authentication client id',
        KeyId: 'alias/felix/settings',
        Type: 'SecureString'
      },
      {
        Name: 'clientSecret',
        Description: 'The Commercetools Authentication client secret',
        KeyId: 'alias/felix/settings',
        Type: 'SecureString'
      }
    ]
  }
];

ssmToObjByPath({
  Path: pathPrefix,
  nestObject: true,
  WithDecryption: true
}, (_, existingValues) => {
  console.log(`Felix Configuration Setup:

Felix uses the EC2 Parameter Store to load its configuration. Let's make sure you
have all of the correct parameters created in the right paths and the right ones
are encrypted.
`);

  const corrections = [];

  config.forEach(plugin => {
    console.log(`Plugin: ${plugin.Name}
Description: ${plugin.Description}`);
    if (!plugin.required && readline.keyInYN('Do you want to configure this plugin? ') === false) {
      console.log('');
      return;
    }

    plugin.parameters.forEach(param => {
      console.log(`  Parameter: ${pathPrefix}${plugin.Name}/${param.Name}
  Description: ${param.Description}`);

      let existingValue = '';
      if (existingValues && plugin.Name in existingValues && param.Name in existingValues[plugin.Name]) {
        existingValue = existingValues[plugin.Name][param.Name];
      } else if ('default' in param) {
        existingValue = param.default;
      }

      const newValue = readline.question(`  Value (${existingValue}): `, { defaultInput: existingValue });

      param.Name = `${pathPrefix}${plugin.Name}/${param.Name}`;
      param.Value = newValue;
      param.Overwrite = true;

      if (newValue === '' || newValue === undefined) {
        console.log(`    Refusing to update empty setting ${pathPrefix}${plugin.Name}${param.Name}.`);
      } else {
        console.log(`    ${pathPrefix}${plugin.Name}${param.Name} => ${newValue}`);
        corrections.push(param);
      }

      console.log('');
    });
    console.log('');
  });

  console.log('');
  updateParams(corrections.shift(), corrections);
});

function updateParams (param, array) {
  console.log(`${param.Name} => ${param.Value}`);
  if ('default' in param) {
    delete param.default;
  }

  ssm.putParameter(param, (err, data) => {
    if (err) {
      console.log('  ERROR!');
      console.log(err);
    } else {
      console.log('  SUCCESS!');
      if (array.length > 0) updateParams(array.shift(), array);
      else {
        console.log('');
        console.log('DONE!');
      }
    }
  });
}
