/**
 * Controller for search endpoints
 */
const helper = require('../common/helper')
const service = require('../services/SearchService')

/**
 * Search members
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchMembers (req, res) {
  const result = await service.searchMembers(req.authUser, req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * Search members
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function autocomplete (req, res) {
  const result = await service.autocomplete(req.authUser, req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * Search members with additional parameters, like skills
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchMembersBySkills (req, res) {
  const result = await service.searchMembersBySkills(req.authUser, req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}
module.exports = {
  searchMembers,
  searchMembersBySkills,
  autocomplete
}
