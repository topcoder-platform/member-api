/**
 * Controller for statistics endpoints
 */
const service = require('../services/StatisticsService')

/**
 * Get distribution statistics
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getDistribution (req, res) {
  const result = await service.getDistribution(req.query)
  res.send(result)
}

/**
 * Get member history statistics
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getHistoryStats (req, res) {
  const result = await service.getHistoryStats(req.params.handle, req.query)
  res.send(result)
}

/**
 * Get member statistics
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getMemberStats (req, res) {
  const result = await service.getMemberStats(req.params.handle, req.query)
  res.send(result)
}

module.exports = {
  getDistribution,
  getHistoryStats,
  getMemberStats
}
