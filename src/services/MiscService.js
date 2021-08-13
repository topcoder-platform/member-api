/**
 * This service provides operations of statistics.
 */

const Joi = require('joi')
const helper = require('../common/helper')
const logger = require('../common/logger')

const MEMBER_FINANCIAL_FIELDS = ['userId', 'amount', 'status', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']

/**
 * Get member financial data.
 * @param {Object} currentUser the user who performs operation
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the member financial data
 */
async function getMemberFinancial (currentUser, handle, query) {
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, MEMBER_FINANCIAL_FIELDS) || MEMBER_FINANCIAL_FIELDS
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  // // only admin, M2M or user himself can get financial data
  // if (!helper.canManageMember(currentUser, member)) {
  //   throw new errors.ForbiddenError('You are not allowed to get financial data of the user.')
  // }
  // // get financial data by member user id
  // let data = await helper.getEntityByHashKey(handle, 'MemberFinancial', 'userId', member.userId, true)
  // // select fields if provided
  // if (fields) {
  //   data = _.pick(data, fields)
  // }
  // return data
  return { 'message': 'No Data' }
}

getMemberFinancial.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    fields: Joi.string()
  })
}

module.exports = {
  getMemberFinancial
}

logger.buildService(module.exports)
