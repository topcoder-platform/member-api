/**
 * Controller for misc endpoints
 */
const service = require('../services/MiscService')

/**
 * Get member financial data
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getMemberFinancial (req, res) {
  const result = await service.getMemberFinancial(req.authUser, req.params.handle, req.query)
  res.send(result)
}

module.exports = {
  getMemberFinancial
}
