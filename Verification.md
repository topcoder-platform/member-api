# TopCoder Member API v5 Verification

## Postman tests
- clear the environment, run command `npm run init-db` and `npm run init-es force`
- create test data in ES and DB, run `npm run seed-data`
- import Postman collection and environment in the docs folder to Postman
- run the tests

## DynamoDB Verification
Run command `npm run view-db-data <ModelName>` to view table data, ModelName can be `Member`

## S3 Verification

Login to AWS Console, S3 service, view the bucket content.

## ElasticSearch Verification

Run command `npm run view-es-data` to view data store in ES.

## Bus Event Verification

- login `https://lauscher.topcoder-dev.com/` with credential `tonyj / appirio123`
- then select topic to view, see app-constants.js TOPICS field for used topics, then click `View` button to view related messages

