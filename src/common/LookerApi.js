/**
 * This module contains the looker api methods.
 * Code copy from https://github.com/topcoder-platform/onboarding-processor/src/common/LookerApi
 */
const config = require('config')
const axios = require('axios')

const LookAuth = require('./LookerAuth')

/**
 * Create LookApi instance
 * @param {Object} logger the logger object
 * @returns the LookApi instance
 */
function LookApi (logger) {
  this.BASE_URL = config.LOOKER.API_BASE_URL
  this.formatting = 'json'
  this.logger = logger
  this.query_timezone = 'America/New_York'
  this.lookAuth = new LookAuth(logger)
}

/**
 * Find recent verified members
 * @param {String} duration the verification date duration to filter
 * @returns an array of verified members
 */
LookApi.prototype.findRecentVerifiedMembers = function (duration) {
  const isProd = process.env.NODE_ENV === 'production'
  const view = isProd ? 'member_verification' : 'member_verification_dev'
  const fields = [`${view}.user_id`, `${view}.verification_mode`, `${view}.status`, `${view}.matched_on`, `${view}.verification_date`]
  const filters = { [`${view}.verification_date`]: duration }
  return this.runQueryWithFilter('member_profile', view, fields, filters)
}

/**
 * Run query with filter
 * @param {String} model the model name
 * @param {String} view the view name
 * @param {Array} fields the fields
 * @param {Object} filters the filters
 * @returns the query result
 */
LookApi.prototype.runQueryWithFilter = function (model, view, fields, filters) {
  const endpoint = `${this.BASE_URL}/queries/run/${this.formatting}`

  const body = {
    model,
    view,
    filters,
    fields,
    query_timezone: this.query_timezone
  }
  return this.callApi(endpoint, body)
}

/**
 * Request an api
 * @param {String} endpoint the endpoint url
 * @param {Object} body the request body
 * @returns the response body
 */
LookApi.prototype.callApi = function (endpoint, body) {
  return this.lookAuth.getToken().then((token) => {
    const newReq = axios.post(endpoint, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${token}`
      }
    })
    return newReq
  }).then((res) => {
    this.logger.debug(res.data)
    return res.data
  }).catch((err) => this.logger.error(err))
}

module.exports = LookApi
