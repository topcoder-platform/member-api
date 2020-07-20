/**
 * Controller for health check endpoint
 */
const config = require('config')
const service = require('../services/SearchService')
const errors = require('../common/errors')

// the topcoder-healthcheck-dropin library returns checksRun count,
// here it follows that to return such count
let checksRun = 0

/**
 * Check health of the app
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function checkHealth (req, res) {
  // perform a quick database access operation, if there is no error and is quick, then consider it healthy
  checksRun += 1
  const timestampMS = new Date().getTime()
  try {
    await service.searchMembers(null, { page: 1, perPage: 1 })
  } catch (e) {
    throw new errors.ServiceUnavailableError(`There is database operation error, ${e.message}`)
  }
  if (new Date().getTime() - timestampMS > Number(config.HEALTH_CHECK_TIMEOUT)) {
    throw new errors.ServiceUnavailableError('Database operation is slow.')
  }
  // there is no error, and it is quick, then return checks run count
  res.send({ checksRun })
}

module.exports = {
  checkHealth
}
