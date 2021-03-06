/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')

const awsConfig = {
  region: config.AMAZON.AWS_REGION
}
if (config.AMAZON.AWS_ACCESS_KEY_ID && config.AMAZON.AWS_SECRET_ACCESS_KEY) {
  awsConfig.accessKeyId = config.AMAZON.AWS_ACCESS_KEY_ID
  awsConfig.secretAccessKey = config.AMAZON.AWS_SECRET_ACCESS_KEY
}

dynamoose.AWS.config.update(awsConfig)

if (config.AMAZON.IS_LOCAL_DB) {
  dynamoose.local(config.AMAZON.DYNAMODB_URL)
}

dynamoose.setDefaults({
  create: false,
  update: false,
  waitForActive: false
})

module.exports = {
  Member: dynamoose.model('MemberProfile', require('./Member')),
  MemberTrait: dynamoose.model('MemberProfileTrait', require('./MemberTrait')),
  MemberStats: dynamoose.model('MemberStats', require('./MemberStats')),
  MemberStatsPrivate: dynamoose.model('MemberStats_Private', require('./MemberStatsPrivate')),
  MemberHistoryStats: dynamoose.model('MemberStatsHistory', require('./MemberHistoryStats')),
  MemberHistoryStatsPrivate: dynamoose.model('MemberStatsHistory_Private', require('./MemberHistoryStatsPrivate')),
  MemberDistributionStats: dynamoose.model('RatingsDistribution', require('./MemberDistributionStats')),
  MemberEnteredSkills: dynamoose.model('MemberEnteredSkills', require('./MemberEnteredSkills')),
  MemberAggregatedSkills: dynamoose.model('MemberAggregatedSkills', require('./MemberAggregatedSkills')),
  MemberFinancial: dynamoose.model('MemberFinancial', require('./MemberFinancial'))
}
