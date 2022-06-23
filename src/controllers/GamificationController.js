/**
 * Controller for Gamification endpoints
 */
const service = require('../services/GamificationService')

/**
 * Get member's rewards
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getMemberRewards (req, res) {
  const result = await service.getMemberRewards(req.authUser, req.params.handle, req.query)
  res.send(result)
}

module.exports = {
  getMemberRewards
}
