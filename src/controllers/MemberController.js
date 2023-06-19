/**
 * Controller for members endpoints
 */
const service = require('../services/MemberService')

/**
 * Get member data
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getMember (req, res) {
  const result = await service.getMember(req.authUser, req.params.handle, req.query)
  res.send(result)
}
/**
 * Get member profile completeness data, for new profile nudge (MP-70)
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getProfileCompleteness (req, res) {
  const result = await service.getProfileCompleteness(req.authUser, req.params.handle, req.query)
  res.send(result)
}

/**
 * Update member data, only passed fields are updated
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function updateMember (req, res) {
  const result = await service.updateMember(req.authUser, req.params.handle, req.query, req.body)
  res.send(result)
}

/**
 * Verify email
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function verifyEmail (req, res) {
  const result = await service.verifyEmail(req.authUser, req.params.handle, req.query)
  res.send(result)
}

/**
 * Upload photo
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function uploadPhoto (req, res) {
  const result = await service.uploadPhoto(req.authUser, req.params.handle, req.files)
  res.send(result)
}

module.exports = {
  getMember,
  getProfileCompleteness,
  updateMember,
  verifyEmail,
  uploadPhoto
}
