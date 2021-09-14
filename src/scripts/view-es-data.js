/**
 * View all ES data.
 */

require('../../app-bootstrap')
const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')

if (process.argv.length <= 2) {
  logger.info('Please provide index name: "member" or "member_trait"')
  process.exit(1)
}
const indexName = process.argv[2]
const typeMapping = {
  [config.get('ES.MEMBER_PROFILE_ES_INDEX')]: config.get('ES.MEMBER_PROFILE_ES_TYPE'),
  [config.get('ES.MEMBER_TRAIT_ES_INDEX')]: config.get('ES.MEMBER_TRAIT_ES_TYPE'),
  [config.get('ES.MEMBER_STATS_ES_INDEX')]: config.get('ES.MEMBER_STATS_ES_TYPE'),
  [config.get('ES.MEMBER_SKILLS_ES_INDEX')]: config.get('ES.MEMBER_SKILLS_ES_TYPE')
}
const esClient = helper.getESClient()

async function showESData () {
  const result = await esClient.search({
    index: indexName,
    type: typeMapping[indexName] // type name is same for all indices
  })
  return result.hits.hits || []
}

showESData()
  .then(result => {
    if (result.length === 0) {
      logger.info('It is empty.')
    } else {
      logger.info('All data in ES are shown below:')
      logger.info(JSON.stringify(result, null, 2))
    }
    logger.info('Done!')
    process.exit()
  })
  .catch(err => {
    logger.logFullError(err)
    process.exit(1)
  })
