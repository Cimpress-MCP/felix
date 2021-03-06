[![Build Status](https://travis-ci.org/Cimpress-MCP/felix.svg?branch=master)](https://travis-ci.org/Cimpress-MCP/felix)
[![Code Climate](https://codeclimate.com/github/Cimpress-MCP/felix/badges/gpa.svg)](https://codeclimate.com/github/Cimpress-MCP/felix)
[![Test Coverage](https://codeclimate.com/github/Cimpress-MCP/felix/badges/coverage.svg)](https://codeclimate.com/github/Cimpress-MCP/felix/coverage)

[![dependencies Status](https://david-dm.org/Cimpress-MCP/felix/status.svg)](https://david-dm.org/Cimpress-MCP/felix)
[![devDependencies Status](https://david-dm.org/Cimpress-MCP/felix/dev-status.svg)](https://david-dm.org/Cimpress-MCP/felix?type=dev)

# Felix

![Felix Logo](/readme-assets/logo.png)

**Felix** rotates your IAM keys!

## Table of Contents

- [About](#about)
- [Architecture](#architecture)
- [Configuration and Deployment](#config_and_deploy)
- [IAM Configuration](#iam_config)
- [Contributing](#contributing)

## About <a name = "about"></a>

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

## Architecture <a name = "architecture"></a>

Architecture for this project is relatively simple.  There are only 4 main components that can be separated into two categories:

### Category One: Infrastructure in YOUR AWS account

1. The Lambda Function itself
1. Systems Management Parameter Store parameters
1. IAM users

### Category Two: External Systems containing keys

1. GitLab
1. SumoLogic
1. Travis-CI

The felix Lambda function loads AWS Parameter Store (SSM) parameters that are appropriately named (see [Configuration](#configuration) section below), creates new access keys for IAM users that are appropriately pathed (see [IAM User Path Construction](#iam_user_path) section below), and using access provided by your SSM parameters, updates your configured external system (GitLab, SumoLogic, or Travis-CI).

![Felix Architecture](./readme-assets/felix-architecture.png)
[Felix Architecture Diagram](https://cim.link/u1h2dl)

## Deployment and Configuration <a name = "config_and_deploy"></a>

### Deploying from source

* Clone this repository (or `sls install`).
* `npm install`
* Get some IAM or STS keys for your account
* `sls deploy --region [the region you want]`
* `npm run configure` to perform some first-time config in the Parameter Store.

### Configuration <a name = "configuration"></a>

#### Quickstart with `configure.js`

There is a [`configure.js`](./configure.js) script at the root of this
repository that will configure all necessary configuration settings in SSM.

You can run it with `npm run configure` or `node ./configure.js`.

**NOTE**: Make sure you have your proper account, profile, and region set in
your AWS config before running this.

This will go through all possible settings, suggest sane defaults, and give you
the option to configure some plugins (you can skip plugins you don't plan to
use).

#### Configuration details

Configuration for **Felix** plugins is generally performed by
[metafig](https://github.com/Cimpress-MCP/metafig).

Since most plugins will need some kind of secret value, this makes
it easy to configure your plugins without any danger of accidentally
hardcoding or committing secret values.

See the default config in [`config.json`](config.json).

By default, everything under `plugins` is run through [`metafig`](https://github.com/Cimpress-MCP/metafig). In this case, all of
the configuration for the `gitlab` plugin is pulled from the AWS Parameter
Store, using the `/felix/gitlab` path. All of those values are populated
into your configuration object and passed to the plugin when it is
instantiated.

#### AWS Settings

By default, all AWS settings are loaded from the SSM Parameter Store at `/felix/aws`. It needs the following settings:

* `userPath`: The IAM path from which to load all users. This should be `/service/` in order to match the default settings. The Lambda execution role only has access to `/service/` by default, so whatever you choose should be under there somewhere.
* `snsTopic`: The ARN of the SNS topic to publish Felix reports to. This should be the SNS topic that was created by the Felix deployment.

#### GitLab Settings

By default, all GitLab settings are loaded from the SSM Parameter Store at `/felix/gitlab`. It needs the following settings:

* `token`: A [GitLab API token](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html) that has access to update build variables for your repositories.
* `url`: The BaseUrl to the GitLab instance you wish to connect to (e.g. `https://gitlab.mycompany.com/`).
* `protectedKeys`: A boolean value determining if Felix should mark the build variables containing the keys as protected.

#### SumoLogic Settings

By default, all SumoLogic settings are loaded from the SSM Parameter Store at `/felix/sumologic`. It needs the following settings:

* `keyId`: A SumoLogic key pair id that has access to update your sources and collectors.
* `secretKey`: A SumoLogic key pair key that has access to update your sources and collectors.
* `url`: The BaseUrl to the SumoLogic API you wish to talk to (e.g. `https://api.us2.sumologic.com/api/v1`).

#### Travis Settings

By default, all SumoLogic settings are loaded from the SSM Parameter Store at `/felix/travis`. It needs the following settings:

* `token`: A TravisCI API Key. You can see [the Travis docs](https://developer.travis-ci.org/authentication) for information on generating this.

## IAM User Configuration <a name = "iam_config"></a>

**Felix** uses IAM usernames and paths to intuit basic information about what
the user is used for and where the keys are stored.

As an example, `/service/travis/Cimpress-MCP/felix@travis` describes the IAM
user used for this project.

**Felix** tries to manage *all* users under `/service/`. The next piece of the path (in this case, `/travis/`) tells Felix about the desired plugin it should
use to manage this user. In this case, the `travis` plugin. When the user's
information is passed to the plugin, it uses the rest of the information to
figure out how to address that user's credentials in the service. In this case,
it uses the Travis API to manage environment variables in the
`Cimpress-MCP/Felix` repository.

The `@travis` at the end of the username is discarded by Felix and used only to
avoid IAM username collisions in case you, for example, also used sumologic
with your application and needed to manage an S3 hosted collector.

The cool thing about this is that **Felix** can manage all of your keys and
users without you needing to write and maintain a complex configuration file.
Your users *are* your source of truth.

### IAM User Path Construction <a name = iam_user_path></a>

* GitLab: `/service/gitlab/[group]/[project]@gitlab`
  * Note: subgroups do not work at this time.
* Sumo: `/service/sumo/[collector]/[source]@sumo`
* Travis: `/service/travis/[org]/[repo]@travis`

## 👩‍💻 Contributing <a name="contributing"></a>

Contributions to this project are welcome.  If you'd like to lend a hand have a member of the Cimpress Open Source community review for work for inclusion just do a standard pull request:

1. Clone this repo
1. Make a branch for your work
1. Do your stuff
1. Push your branch!
1. Open a Merge Request.
1. Your work will be reviewed, commented on, and/or merged.

Please note that your branch must pass our minimum commit checks prior to consideration:
![commit-checks](readme-assets/commit-checks.png)
