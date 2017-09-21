'use strict'
const nock = require('nock'),
      replayer = require('replayer'),
      xml2js = require('xml2js');
const builder = new xml2js.Builder({
    rootName: 'com.cloudbees.jenkins.plugins.awscredentials.AWSCredentialsImpl'
});

require('should');

describe('Jenkins', function() {
    let jenkins;
    let nockRp;
    const nockUrl = 'https://usr:1@examplejenkins.fake';
    const nockPath = '/credential/fakefakefakefakefakefakefakefake/config.xml';

    before(() => {
        replayer.disable();
        const Jenkins = require('../../../lib/plugins/jenkins');
        jenkins = new Jenkins({
            baseUrl: 'examplejenkins.fake',
            credentialId: 'fakefakefakefakefakefakefakefake',
            userName: 'usr',
            APIKey: '1'
        });
    });

    after(() => {
        replayer.enable();
    });

    describe('#getCredentialInfo', function() {

        it('Should return a credentials object if the response status code is 200', function(){
            const bodyValue = builder.buildObject({
                $: {plugin: 'aws-credentials@1.17'},
                id: 'id',
                description: 'description',
                accessKey: 'fakefakefakefakefakefakefakefake'
            });
            
            nockRp = nock(nockUrl).get(nockPath).reply(200, bodyValue);
            
            return jenkins.getCredentialInfo()
            .then((results) => {
                results.should.eql({
                    credentialExists: true,
                    id:'id',
                    description: 'description',
                    accessKey: 'fakefakefakefakefakefakefakefake'
                });
            });
        });

        it('Should return a object with a credentialExists attribute set to false if the response status code is 404', function(){
            nockRp = nock(nockUrl).get(nockPath).reply(404, 'Its not real');

            return jenkins.getCredentialInfo()
            .then((results) => {
                results.should.eql({credentialExists: false});
            });
        });

        it('Should throw an error if the status code is not one of the above', function(){
            nockRp = nock(nockUrl).get(nockPath).reply(500, 'Its all broken');

            return jenkins.getCredentialInfo()
            .catch(err => {
                err.should.be.an.Error();
                err.message.should.eql('Error connecting to Jenkins. Status: 500');
            });
        });
    })

    describe('#checkForActiveKey', function() {

        it('Should return a credential object if the active keys match', function(){
            const bodyValue = builder.buildObject({
                $: {plugin: 'aws-credentials@1.17'},
                id:'id',
                description: 'description',
                accessKey: 'fakefakefakefakefakefakefakefake'
            });

            nockRp = nock(nockUrl).get(nockPath).reply(200, bodyValue);

            return jenkins.checkForActiveKey('', 'fakefakefakefakefakefakefakefake')
            .then(result => {
                result.should.eql({
                    id:'id',
                    description: 'description',
                    accessKey: 'fakefakefakefakefakefakefakefake',
                    credentialExists: true
                });
            });
        });

        it('Should throw an error if the active keys don\'t match', function(){
            const bodyValue = builder.buildObject({
                $: {plugin: 'aws-credentials@1.17'},
                id:'id',
                description: 'description',
                accessKey: 'wrongkey'
            });

            nockRp = nock(nockUrl).get(nockPath).reply(200, bodyValue);

            return jenkins.checkForActiveKey('', 'fakefakefakefakefakefakefakefake')
            .catch(err => {
                err.should.be.an.Error();
                err.message.should.eql('Key found in service not same as active key!');
            });
        });

        it('Should return an object with only credentialExists if there is no credential in Jenkins', function(){
            nockRp = nock(nockUrl).get(nockPath).reply(404, 'Its not here');

            return jenkins.checkForActiveKey('', 'fakefakefakefakefakefakefakefake')
            .then(result => {
                result.should.eql({credentialExists: false});
            });
        });

    })

    describe('#createOrUpdateKey', function() {

        it('Should create a new credential when one doesn\'t already exist', function() {
            nockRp = nock(nockUrl)
            .get(nockPath).reply(404, 'There\'s no credential here')
            .post('/createCredentials').reply(200, 'Jenkins 200');

            return jenkins.createOrUpdateKey('', {AccessKeyId: 'NewNewNewNewNewNew', SecretAccessKey: 'SecretSecretSecret'})
            .then(response => {
                response.updateOrCreate.should.eql('create');
            });
        });

        it('Should update the credential when it already exists', function() {
            const bodyValue = builder.buildObject({
                $: {plugin: 'aws-credentials@1.17'},
                id:'id',
                description: 'description',
                accessKey: 'fakefakefakefakefakefakefakefake'
            });

            nockRp = nock(nockUrl)
            .get(nockPath).reply(200, bodyValue)
            .post(nockPath).reply(200, 'Jenkins 200');


            return jenkins.createOrUpdateKey('', {AccessKeyId: 'NewNewNewNewNewNew', SecretAccessKey: 'SecretSecretSecret'})
            .then(response => {
                response.updateOrCreate.should.eql('update');
            });
        });
    });

});