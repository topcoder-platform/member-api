/**
 * Controller for member traits endpoints
 */
const service = require('../services/MemberTraitService')

/**
 * Get member traits
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getTraits (req, res) {
  const result = await service.getTraits(req.authUser, req.params.handle, req.query)
  res.send(result)
}

/**
 * Create member traits
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createTraits (req, res) {
  const result = await service.createTraits(req.authUser, req.params.handle, req.body)
  res.send(result)
}

/**
 * Update member traits
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function updateTraits (req, res) {
  const result = await service.updateTraits(req.authUser, req.params.handle, req.body)
  res.send(result)
}

/**
 * Remove member traits
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function removeTraits (req, res) {
  await service.removeTraits(req.authUser, req.params.handle, req.query)
  res.end()
}

module.exports = {
  getTraits,
  createTraits,
  updateTraits,
  removeTraits
}
