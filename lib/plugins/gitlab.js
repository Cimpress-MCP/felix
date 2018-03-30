'use strict';
const request = require('request-promise');

class GitLab {
  constructor (settings) {
    this.setKeysAsProtected = ((settings.protectedKeys === 'true') || (settings.protectedKeys === 'True'));
    this.client = request.defaults({
      baseUrl: settings.url,
      headers: {
        'PRIVATE-TOKEN': settings.token,
        'Content-Type': 'application/json'
      },
      json: true
    });
  }

  getProject (group, project) {
    const namespace = encodeURIComponent(`${group}/${project}`);
    return this.client({
      uri: `/api/v4/projects/${namespace}`
    });
  }

  getVariables (projectId) {
    return this.client({
      uri: `/api/v4/projects/${projectId}/variables`
    });
  }

  createKey (projectId, key) {
    return this.client({
      uri: `/api/v4/projects/${projectId}/variables`,
      method: 'POST',
      body: {
        key: 'AWS_ACCESS_KEY_ID',
        value: key.AccessKeyId,
        protected: this.setKeysAsProtected
      }
    })
      .then(() => {
        return this.client({
          uri: `/api/v4/projects/${projectId}/variables`,
          method: 'POST',
          body: {
            key: 'AWS_SECRET_ACCESS_KEY',
            value: key.SecretAccessKey,
            protected: this.setKeysAsProtected
          }
        });
      });
  }

  updateKey (projectId, key) {
    return this.client({
      uri: `/api/v4/projects/${projectId}/variables/AWS_ACCESS_KEY_ID`,
      method: 'PUT',
      body: {
        key: 'AWS_ACCESS_KEY_ID',
        value: key.AccessKeyId,
        protected: this.setKeysAsProtected
      }
    })
      .then(() => {
        return this.client({
          uri: `/api/v4/projects/${projectId}/variables/AWS_SECRET_ACCESS_KEY`,
          method: 'PUT',
          body: {
            key: 'AWS_SECRET_ACCESS_KEY',
            value: key.SecretAccessKey,
            protected: this.setKeysAsProtected
          }
        });
      });
  }

  createOrUpdateKey (metadata, key) {
    let {group, project} = this.parseMetadata(metadata);
    let projectId = -1;

    return this.getProject(group, project)
      .then(pj => {
        projectId = pj.id;
        return this.getVariables(projectId);
      })
      .then(variables => {
        if (variables.filter(v => (v.key === 'AWS_ACCESS_KEY_ID')).length > 0) {
          return this.updateKey(projectId, key);
        } else {
          return this.createKey(projectId, key);
        }
      });
  }

  parseMetadata (metadata) {
    // Drop all of the plugin-identitifaction metadata
    const [, , , ...projectPath] = metadata.split('/');

    // GitLab allows nested groups, all but the last element
    // is the group identifier, and the last element is the
    // project
    let group = projectPath.slice(0, -1).join('/'),
      project = projectPath[projectPath.length - 1];

    return {
      group, project
    };
  }

  checkForActiveKey (metadata, keyId) {
    let {group, project} = this.parseMetadata(metadata);

    return this.getProject(group, project)
      .then(project => {
        return this.getVariables(project.id);
      })
      .then(variables => {
        return variables.filter(v => (v.key === 'AWS_ACCESS_KEY_ID' || v.key === 'AWS_SECRET_ACCESS_KEY'))
          .reduce(function (obj, item) {
            obj[item.key] = item.value;
            return obj;
          }, {});
      })
      .then(key => {
        if (key.AWS_ACCESS_KEY_ID !== keyId) {
          throw new Error('Key found in service not same as active key!');
        } else {
          return key;
        }
      });
  }
}

module.exports = GitLab;
