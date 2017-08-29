# Contributing

When contributing to this repository, please first discuss the change you wish
to make via issue, email, or any other method with the owners of this
repository before making a change.

## Development

This is a `serverless` project, meant to be run inside of AWS Lambda.

```bash
$ nvm use # use the designated version of node - currently 6.10.2.
$ npm install # install all runtime and development dependencies
```

Now you have the correct version of node and the serverless framework installed.
Here are some useful commands to use while making your changes.

```bash
$ npm test          # run unit tests and generate coverage report,
                    # fails if there is insufficient coverage.

$ npm run local     # execute the function locally

$ npm run remote    # execute the function remotely in aws
                    # (it must already be deployed)

$ npm run deploy    # deploy the function to AWS

$ npm run lint      # run the linter for style and formatting

$ npm run depcheck  # check for unused, out-of-date, or insecure dependencies

$ npm run climate   # run clodeclimate checks locally

$ npm run preflight # lint, check dependencies, and test
```

Note that running the function (even locally) will actually rotate your keys!

## Pull Request Process

1. Open an issue stating your intention to make a change. This will give past
   contributors and users time to offer suggestions and feedback before you get
   too far into things.
1. Make your change in the code. This includes implementing your intended
   change, linting your code, ensuring all current tests pass, and that you have
   provided new tests for your changes where appropriate.
1. Update the README.md or other documentation with details of changes to the
   project - new options, configuration, features, etc.
1. The owners of this repository will review your change and may make
   suggestions or decline your pull request. After they have finished
   reviewing, they may approve the request. Once all relevant parties have
   signed off. Someone will merge and release your change.
