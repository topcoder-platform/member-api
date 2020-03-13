/**
 * Initialize database tables. All data will be cleared.
 */
require('../app-bootstrap')
const logger = require('./common/logger')
const helper = require('./common/helper')

logger.info('Initialize database.')

const initDB = async () => {
  const members = await helper.scan('Member')
  for (const member of members) {
    await member.delete()
  }
  const traits = await helper.scan('MemberTrait')
  for (const trait of traits) {
    await trait.delete()
  }
}

initDB().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
