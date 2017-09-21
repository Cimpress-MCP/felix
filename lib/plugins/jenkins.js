'use strict';
const request = require('request-promise'),
      xml2js = require('xml2js');

const parseXMLString = xml2js.parseString;
const builder = new xml2js.Builder({
        rootName: 'com.cloudbees.jenkins.plugins.awscredentials.AWSCredentialsImpl'
      });

class Jenkins {
    constructor(settings) {
        this.client = request.defaults({
            baseUrl: `https://${settings.userName}:${settings.APIKey}@${settings.baseUrl}`,
            headers:{
                'Content-Type' : 'application/xml'
            },
            resolveWithFullResponse: true,
            simple: false
        });
        this.credentialId = settings.credentialId;
    }

    getCredentialInfo(){
        return this.client({
            uri:`/credential/${this.credentialId}/config.xml`,
            method: 'GET',
        })
        .then(result => {
            switch (result.statusCode) {
                case 200:
                    let credential;
                    parseXMLString(result.body, (error, resultAsString) => {
                        const resultAsJSON = JSON.parse(JSON.stringify(resultAsString))['com.cloudbees.jenkins.plugins.awscredentials.AWSCredentialsImpl'];
                        credential = {
                            credentialExists: true,
                            id: resultAsJSON.id[0],
                            description: resultAsJSON.description[0],
                            accessKey: resultAsJSON.accessKey[0],
                        }
                    });
                    return credential;
                    
                case 404:
                    return {credentialExists: false};
                    
                default:
                    throw new Error(`Error connecting to Jenkins. Status: ${result.statusCode}`);
            }
        });
    }

    checkForActiveKey(metadata, keyId){
        return this.getCredentialInfo()
        .then(credential => {
            if(credential.credentialExists && credential.accessKey != keyId) {
                throw new Error('Key found in service not same as active key!');
            } else {
                return credential;
            }
        })
        .catch(err => {throw err});
    }

    createOrUpdateKey(metadata, key){
        return this.getCredentialInfo()
        .then(credential => {
            if(credential.credentialExists) { //update credential
                const updatedCredentialInXml = builder.buildObject({
                    $: {plugin: 'aws-credentials@1.17'},
                    id: credential.id,
                    description: credential.description,
                    accessKey: key.AccessKeyId,
                    secretKey: key.SecretAccessKey
                });
                return this.client({
                    uri:`/credential/${this.credentialId}/config.xml`,
                    method: 'POST',
                    body: updatedCredentialInXml
                })
                .then(response => {
                    if(response.statusCode == 200) {
                        return {
                            keyRotated: true,
                            updateOrCreate: 'update'
                        }
                    } else {
                        throw new Error(`Unable to update key. Error: ${response.statusCode}`);
                    }
                });
            } else { //create credential
                const updatedCredentialInXml = builder.buildObject({
                    $: {plugin: 'aws-credentials@1.17'},
                    id: this.credentialId,
                    description: `AWS credentials managed through Felix, created by ${metadata}`,
                    accessKey: key.AccessKeyId,
                    secretKey: key.SecretAccessKey
                });
                return this.client({
                    uri:`/createCredentials`,
                    method: 'POST',
                    body: updatedCredentialInXml
                })
                .then(response => {
                    if(response.statusCode == 200) {
                        return {
                            keyRotated: true,
                            updateOrCreate: 'create'
                        }
                    } else {
                        throw new Error(`Unable to create key. Error: ${response.statusCode}`);
                    }
                });
            }
        });
    }
}

module.exports = Jenkins;