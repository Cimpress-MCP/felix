#!/usr/bin/env node

const {SSM} = require('aws-sdk'),
  ssm = new SSM(),
  readline = require('readline-sync'),
  pathPrefix = '/felix/',
  {ssmToObjByPath} = require('ssm-params');

let config = [
  {
    Name: 'aws',
    Description: 'AWS-specific settings for locating IAM users and notifying SNS.',
    required: true,
    parameters: [
      {
        Name: 'snsTopic',
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
    Name: 'jenkins',
    Description: 'Jenkins Open Source Automation Server.',
    required: false,
    parameters: [
      {
        Name:'baseUrl',
        Description: 'Url of the Jenkins master. Do not include authentication or protocol.',
        Type: 'String'
      },
      {
        Name:'credentialId',
        Description:'The id for the credential Jenkins\' stores the AWS keys under.',
        Type:'String'
      },
      {
        Name:'userName',
        Description:'The username used to authenticate with Jenkins.',
        Type:'String'
      },
      {
        Name:'APIKey',
        Description:'The API key used to authenticate with Jenkins.',
        Type:'SecureString'
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

  let corrections = [];

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
      }

      const newValue = readline.question(`  Value (${existingValue}): `, {defaultInput: existingValue});

      param.Name = `${pathPrefix}${plugin.Name}/${param.Name}`;
      param.Value = newValue;
      param.Overwrite = true;

      if (newValue === '' || newValue === undefined) {
        console.log(`    Refusing to update empty setting ${pathPrefix}${plugin.Name}/${param.Name}.`);
      } else {
        console.log(`    ${pathPrefix}${plugin.Name}/${param.Name} => ${newValue}`);
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
