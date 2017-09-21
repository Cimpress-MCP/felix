const sinon = require('sinon'),
  allUsers = [
    {
      UserName: 'metafig@gitlab',
      Path: '/service/gitlab/cloud/',
      CreateDate: '2017-07-03T21:04:16Z',
      UserId: 'AIDAICEYW5PVBSEXAMPLE',
      Arn: 'arn:aws:iam::958703851709:user/service/gitlab/cloud/metafig@gitlab'
    },
    {
      UserName: 'saas-infra@gitlab',
      Path: '/service/gitlab/cloud/',
      CreateDate: '2017-06-29T18:02:14Z',
      UserId: 'AIDAJWYCOMRRVIEXAMPLE',
      Arn: 'arn:aws:iam::958703851709:user/service/gitlab/cloud/saas-infra'
    },
    {
      UserName: 'testuser',
      Path: '/',
      CreateDate: '2017-05-25T20:17:48Z',
      UserId: 'AIDAI5VPPP4MMDEXAMPLE',
      Arn: 'arn:aws:iam::958703851709:user/testuser'
    }
  ];

function listUsers (params, callback) {
  let users = allUsers;
  if (params.PathPrefix) {
    users = users.filter(u => u.Path.startsWith(params.PathPrefix));
  }

  callback(null, {Users: users});
}

function listAccessKeys (params, callback) {
  if (!params.hasOwnProperty('UserName') || params.UserName === undefined) {
    return callback(new Error('Did not get a username!'));
  }

  callback(null, {
    AccessKeyMetadata: [
      {
        UserName: params.UserName,
        Status: 'Active',
        CreateDate: '2017-04-28T14:49:08Z',
        AccessKeyId: 'AKIALKJ39example'
      },
      {
        UserName: params.UserName,
        Status: 'Inactive',
        CreateDate: '2017-07-04T14:38:57Z',
        AccessKeyId: 'AKIAEKLFJexample'
      }
    ]
  });
}

function createAccessKey (params, callback) {
  if (!params.hasOwnProperty('UserName') || params.UserName === undefined) {
    return callback(new Error('Did not get a username!'));
  }

  callback(null, {
    AccessKey: {
      UserName: params.UserName,
      Status: 'Active',
      CreateDate: '2017-07-04T14:38:57.109Z',
      SecretAccessKey: '12345example',
      AccessKeyId: 'AKIA98765example'
    }
  });
}

function updateAccessKey (params, callback) {
  if (!params.hasOwnProperty('UserName') ||
      params.UserName === undefined ||
      !params.hasOwnProperty('AccessKeyId') ||
      params.AccessKeyId === undefined ||
      !params.hasOwnProperty('Status') ||
      params.Status !== 'Inactive') {
    return callback(new Error('There was a problem with the parameters'));
  }

  callback(null, {});
}

function deleteAccessKey (params, callback) {
  callback(null, {});
}

const spies = {
  listUsers: sinon.spy(listUsers),
  listAccessKeys: sinon.spy(listAccessKeys),
  createAccessKey: sinon.spy(createAccessKey),
  updateAccessKey: sinon.spy(updateAccessKey),
  deleteAccessKey: sinon.spy(deleteAccessKey)
};

module.exports = {
  spies: spies,
  IAM: function iam () {
    return spies;
  }
};
