/**
 * Initialize database tables. All data will be cleared.
 */
require('../app-bootstrap')
const logger = require('./common/logger')
const helper = require('./common/helper')

logger.info('Initialize database.')

const initDB = async () => {
  const members = await helper.scan('Member')
  for (const item of members) {
    await item.delete()
  }
  const memberStats = await helper.scan('MemberStats')
  for (const item of memberStats) {
    await item.delete()
  }
  const memberHistoryStats = await helper.scan('MemberHistoryStats')
  for (const item of memberHistoryStats) {
    await item.delete()
  }
  const memberDistributionStats = await helper.scan('MemberDistributionStats')
  for (const item of memberDistributionStats) {
    await item.delete()
  }
  const memberFinancials = await helper.scan('MemberFinancial')
  for (const item of memberFinancials) {
    await item.delete()
  }
  const memberSkills = await helper.scan('MemberSkill')
  for (const item of memberSkills) {
    await item.delete()
  }
}

initDB().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
