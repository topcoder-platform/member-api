/**
 * View all ES data.
 */

require('../../app-bootstrap')
const helper = require('../common/helper')
const logger = require('../common/logger')
const eshelpr = require('../common/eshelper')

if (process.argv.length <= 2) {
  logger.info('Please provide index name: "member" or "member_trait"')
  process.exit(1)
}
const type = process.argv[2]
const indexType = eshelpr.getIndexAndType(type)

const esClient = helper.getESClient()

async function showESData () {
  const result = await esClient.search({
    index: indexType.index,
    type: indexType.type
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
