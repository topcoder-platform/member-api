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
  Member: dynamoose.model('Member', require('./Member')),
  MemberStats: dynamoose.model('MemberStats', require('./MemberStats')),
  MemberHistoryStats: dynamoose.model('MemberHistoryStats', require('./MemberHistoryStats')),
  MemberDistributionStats: dynamoose.model('MemberDistributionStats', require('./MemberDistributionStats')),
  MemberSkill: dynamoose.model('MemberSkill', require('./MemberSkill')),
  MemberFinancial: dynamoose.model('MemberFinancial', require('./MemberFinancial'))
}
