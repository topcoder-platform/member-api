# Topcoder Member API v5

## Dependencies

- nodejs https://nodejs.org/en/ (v10)
- DynamoDB
- AWS S3
- Elasticsearch v6
- Docker, Docker Compose

## Configuration

Configuration for the application is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- LOG_LEVEL: the log level, default is 'debug'
- PORT: the server port, default is 3000
- AUTH_SECRET: The authorization secret used during token verification.
- VALID_ISSUERS: The valid issuer of tokens.
- AUTH0_URL: AUTH0 URL, used to get M2M token
- AUTH0_PROXY_SERVER_URL: AUTH0 proxy server URL, used to get M2M token
- AUTH0_AUDIENCE: AUTH0 audience, used to get M2M token
- TOKEN_CACHE_TIME: AUTH0 token cache time, used to get M2M token
- AUTH0_CLIENT_ID: AUTH0 client id, used to get M2M token
- AUTH0_CLIENT_SECRET: AUTH0 client secret, used to get M2M token
- BUSAPI_URL: Bus API URL
- KAFKA_ERROR_TOPIC: Kafka error topic used by bus API wrapper
- GROUPS_API_URL: Groups API URL
- AMAZON.AWS_ACCESS_KEY_ID: The Amazon certificate key to use when connecting. Use local dynamodb you can set fake value
- AMAZON.AWS_SECRET_ACCESS_KEY: The Amazon certificate access key to use when connecting. Use local dynamodb you can set fake value
- AMAZON.AWS_REGION: The Amazon certificate region to use when connecting. Use local dynamodb you can set fake value
- AMAZON.IS_LOCAL_DB: Use Amazon DynamoDB Local or server.
- AMAZON.DYNAMODB_URL: The local url if using Amazon DynamoDB Local
- AMAZON.PHOTO_S3_BUCKET: the AWS S3 bucket to store photos
- AMAZON.S3_API_VERSION: the AWS S3 API version
- ES: config object for Elasticsearch
- ES.HOST: Elasticsearch host
- ES.API_VERSION: Elasticsearch API version
- ES.MEMBER_PROFILE_ES_INDEX: Elasticsearch index name for member profile
- ES.MEMBER_PROFILE_ES_TYPE: Elasticsearch index type for member profile
- ES.MEMBER_TRAIT_ES_INDEX: Elasticsearch index name for member trait
- ES.MEMBER_TRAIT_ES_TYPE: Elasticsearch index type for member trait
- ES.MEMBER_STATS_ES_INDEX: Elasticsearch index name for member stats
- ES.MEMBER_STATS_ES_TYPE: Elasticsearch index type for member stats
- ES.MEMBER_SKILLS_ES_INDEX: Elasticsearch index name for member skills
- ES.MEMBER_SKILLS_ES_TYPE: Elasticsearch index type for member skills
- FILE_UPLOAD_SIZE_LIMIT: the file upload size limit in bytes
- PHOTO_URL_TEMPLATE: photo URL template, its <key> will be replaced with S3 object key
- VERIFY_TOKEN_EXPIRATION: verify token expiration in minutes
- EMAIL_VERIFY_AGREE_URL: email verify agree URL, the <emailVerifyToken> will be replaced with generated verify token
- EMAIL_VERIFY_DISAGREE_URL: email verify disagree URL
- SCOPES: the configurable M2M token scopes, refer `config/default.js` for more details
- MEMBER_SECURE_FIELDS: Member profile identifiable info fields, only admin, M2M, or member himself can fetch these fields
- MEMBER_TRAIT_SECURE_FIELDS: Member traits identifiable info fields, only admin, M2M, or member himself can fetch these fields
- MISC_SECURE_FIELDS: Misc identifiable info fields, only admin, M2M, or member himself can fetch these fields
- SEARCH_SECURE_FIELDS: Member Search identifiable info fields, only admin, M2M, or member himself can fetch these fields
- STATISTICS_SECURE_FIELDS: Member Statistics identifiable info fields, only admin, M2M, or member himself can fetch these fields
- HEALTH_CHECK_TIMEOUT: health check timeout in milliseconds

Set the following environment variables used by bus API to get TC M2M token (use 'set' insted of 'export' for Windows OS):
```
export AUTH0_CLIENT_ID=8QovDh27SrDu1XSs68m21A1NBP8isvOt
export AUTH0_CLIENT_SECRET=3QVxxu20QnagdH-McWhVz0WfsQzA1F8taDdGDI4XphgpEYZPcMTF4lX3aeOIeCzh
export AUTH0_URL=https://topcoder-dev.auth0.com/oauth/token
export AUTH0_AUDIENCE=https://m2m.topcoder-dev.com/
```

Also properly configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, PHOTO_S3_BUCKET, IS_LOCAL_DB config parameters.

Test configuration is at `config/test.js`. You don't need to change them.
The following test parameters can be set in config file or in env variables:

- ADMIN_TOKEN: admin token
- USER_TOKEN: user token
- EXPIRED_TOKEN: expired token
- INVALID_TOKEN: invalid token
- M2M_FULL_ACCESS_TOKEN: M2M full access token
- M2M_READ_ACCESS_TOKEN: M2M read access token
- M2M_UPDATE_ACCESS_TOKEN: M2M update (including 'delete') access token
- S3_ENDPOINT: endpoint of AWS S3 API, for unit and e2e test only; default to `localhost:9000`

## AWS S3 Setup
Go to https://console.aws.amazon.com/ and login. Choose S3 from Service folder and click `Create bucket`. Following the instruction to create S3 bucket.
After creating bucket, click `Permissions` tab of the bucket, in the `Block public access` section, disable the block, so that public access
is allowed, then we can upload public accessible photo to the bucket.

## Local services setup
In the `local` folder, run `docker-compose up`
It starts Elasticsearch, DynamoDB and S3 compatible server.

## Create Tables
1. Make sure DynamoDB are running as per instructions above.
2. Make sure you have configured all config parameters. Refer [Configuration](#configuration)
3. Run `npm run create-tables` to create tables.

## Scripts
1. Drop DB tables: `npm run drop-tables`
2. Create DB tables: `npm run create-tables`
3. Initialize/Clear database: `npm run init-db`
4. Create Elasticsearch index: `npm run init-es`, or to re-create index: `npm run init-es force`
5. Seed/Insert data to ES and DB: `npm run seed-data`
6. View DB table data: `npm run view-db-data <ModelName>`, ModelName can be `Member`, `MemberTrait`, `MemberDistributionStats`, `MemberHistoryStats`, `MemberStats`, `MemberSkill` or `MemberFinancial`
7. View ES data: `npm run view-es-data <IndexName>`, IndexName can be `member`, `member_trait`

## Local Deployment

- Install dependencies `npm install`
- Run lint `npm run lint`
- Run lint fix `npm run lint:fix`
- initialize Elasticsearch, create configured Elasticsearch index if not present: `npm run init-es`,
  or re-create the index: `npm run init-es force`
- Create tables `npm run create-tables`
- Clear and init db data `npm run init-db`
- Start app `npm start`
- App is running at `http://localhost:3000`

## Local Deployment with Docker

To run the app using docker, follow the below steps:

1. Navigate to the directory `docker`

2. Rename the file `sample.api.env` to `api.env`

3. Set the required AWS credentials in the file `api.env`, you may add more env variables to this file if needed

4. Once that is done, run the following command

```
docker-compose up
```

5. When you are running the application for the first time, It will take some time initially to download the image and install the dependencies


## Running tests

### Prepare
- Various config parameters should be properly set.
- Start Local services.
- Create DynamoDB tables.
- Initialize ES index.
- No need to seed test data, the tests should run in clean environment, if there are data in ES and DB, then clear them by running
  `npm run init-db` and `npm run init-es force`


### Running unit tests
To run unit tests alone

```bash
npm run test
```

To run unit tests with coverage report

```bash
npm run test:cov
```

### Running integration tests
To run integration tests alone

```bash
npm run e2e
```

To run integration tests with coverage report

```bash
npm run e2e:cov
```

## Verification
Refer to the verification document `Verification.md`

## Notes

- all JWT tokens provided in Postman environment file and tests are created in `https://jwt.io` with secret `mysecret`
- you don't need to setup the (https://github.com/topcoder-platform/member-processor-es),
  because there is seed-data script to setup data to test the members API,
  the tests also have setup data properly
- the tests use mock S3 service, so you may use the provided mock AWS credential for tests,
  but Postman tests require using real AWS S3, you need to follow above to create S3 bucket and provide your own AWS credential
  so that the upload photo API works
- the tests use mock S3 service to upload member photo, so you may use the provided mock AWS credential for tests,
  but Postman tests require using real AWS S3, you need to follow README.md to create S3 bucket and provide your own AWS credential
  so that the upload photo API works

