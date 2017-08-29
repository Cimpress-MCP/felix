## Felix

![Felix Logo](./logo.png)

**Felix** rotates your IAM keys!

Managing your IAM keys is a fundamental piece of AWS security. It's also one
of the easiest things to get wrong. In fact, the easiest way to manage your
IAM keys is to just not ever have any.

But that only gets you so far. Some third-party services can't integrate via
cross-account roles or bucket policies. Sometimes you need to run pieces of
your infrastructure on-prem or in different Cloud Providers (or otherwise
cannot use STS keys).

So **Felix** is aimed at making it easy to manage IAM keys in third-party
services like SumoLogic and GitLab. It aims to be easily extensible by both
built-in providers and external plugins.

## Configuration and Deployment

This is a serverless project. You'll need `sls` installed to deploy this
package. `npm install -g serverless`.

### Deploying from source

* Clone this repository (or `sls install`).
* Get some IAM or STS keys for your account
* `sls deploy --region [the region you want]`

#### Deployed resources

In additional to the usual Serverless resources (like the deployment bucket,
etc), deploying felix also creates:

* A KMS key with the alias `alias/felix/settings`.
    * Used to encrypt secret SSM Parameters, like API keys.
* An SNS topic called FelixReports.
    * Used for delivery of Felix rotation reports.

The Lambda execution role gets access to:

* Manage Access Keys for IAM users with the path prefix `/service/`.
* Get SSM parameters with the path prefix `/felix/`.
* Decrypt things with the KMS key `alias/felix/settings`.
* Public to the `FelixReports` SNS topic.

All of this is controlled in `serverless.yml` as usual, so see that file
for more information.

### Configuring
#### Quickstart with `configure.js`

There is a [`configure.js`](./configure.js) script at the root of this
repository that will configure all necessary configuration settings in SSM.

**NOTE**: Make sure you have your proper account, profile, and region set in
your AWS config before running this.

This will go through all possible settings, suggest sane defaults, and give you
the option to configure some plugins (you can skip plugins you don't plan to
use).

#### Configuration details

Configuration for **Felix** plugins are performed by
[metafig](https://github.com/Cimpress-MCP/metafig).

Since most plugins will need some kind of secret value, this makes
it easy to configure your plugins without any danger of accidentally
hardcoding or committing secret values.

See the default config in `config.json`:

```json
{
  "plugins": {
    "aws": {
      "awsParam": {
        "path": "/felix/aws",
        "decryption": true
      }
    },
    "gitlab": {
      "awsParam": {
        "path": "/felix/gitlab",
        "decryption": true
      }
    },
    "sumologic": {
      "awsParam": {
        "path": "/felix/sumologic",
        "decryption": true
      }
    },
    "travis": {
      "awsParam": {
        "path": "/felix/travis",
        "decryption": true
      }
    }
  }
}
```

Everything under `plugins` is run through `metafig`. In this case, all of
the configuration for the `gitlab` plugin is pulled from the AWS Parameter
Store, using the `/felix/gitlab` path. All of those values are populated
into your configuration object and passed to the plugin when it is
instantiated.

#### AWS Settings

By default, all AWS settings are loaded from the SSM Parameter Store at `/feilx/aws`. It needs the following settings:

* `userPath`: The IAM path from which to load all users. This should be `/service/` in order to match the default settings. The Lambda execution role only has access to `/service/` by default, so whatever you choose should be under there somewhere.
* `snsTopic`: The ARN of the SNS topic to publish Felix reports to. This should be the SNS topic that was created by the Felix deployment.

#### GitLab Settings

By default, all GitLab settings are loaded from the SSM Parameter Store at `/felix/gitlab`. It needs the following settings:

* `token`: A GitLab API token that has access to update build variables for your repositories.
* `url`: The BaseUrl to the GitLab instance you wish to connect to (e.g. `https://gitlab.mycompany.com/`).

#### SumoLogic Settings

By default, all SumoLogic settings are loaded from the SSM Parameter Store at `/felix/sumologic`. It needs the following settings:

* `keyId`: A SumoLogic key pair id that has access to update your sources and collectors.
* `secretKey`: A SumoLogic key pair key that has access to update your sources and collectors.
* `url`: The BaseUrl to the SumoLogic API you wish to talk to (e.g. `https://api.us2.sumologic.com/api/v1`).

#### Travis Settings

By default, all SumoLogic settings are loaded from the SSM Parameter Store at `/felix/travis`. It needs the following settings:

* `token`: A TravisCI API Key. You can see [the Travis docs](https://developer.travis-ci.org/authentication) for information on generating this.
