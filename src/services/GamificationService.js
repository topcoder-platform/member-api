/**
 * This service provides operations of gamification.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const axios = require('axios')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')

// The Mambo API uses specifically the OAuth 2.0 Client Credentials grant flow.
// https://api.mambo.io/docs/#authentication
// this is where the token is stored after it is exchanged from Mambo
// then it is used on all calls to Mambo API
let MAMBO_ACCESS_TOKEN

/**
 * This function Request Access Token from Mambo by using Client Credentials flow.
 * When token is provided it is stored in MAMBO_ACCESS_TOKEN
 * @returns Promise
 */
async function getAccessToken () {
  const options = {
    method: 'post',
    url: `${config.MAMBO_DOMAIN_URL}/oauth/token`,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.MAMBO_PUBLIC_KEY}:${config.MAMBO_PRIVATE_KEY}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: 'grant_type=client_credentials'
  }

  return axios(options)
    .then(response => {
      MAMBO_ACCESS_TOKEN = response.data
      return response.data
    })
}

/**
 * Helper to reduce boilerplate code
 */
async function ensureTocken () {
  // if no API token, try get one first
  if (!MAMBO_ACCESS_TOKEN) {
    try {
      await getAccessToken()
    } catch (e) {
      logger.debug('getMemberRewards:getAccessToken error', e)
      throw new errors.ForbiddenError('Can\'t get OAuth token from Mambo. Contact admin for help...')
    }
  }
}

/**
 * Get member's rewards
 * API details https://api.mambo.io/docs/#!/Users/getUserRewards
 * @param {Object} currentUser the token user
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the rewards
 */
async function getMemberRewards (currentUser, handle, query) {
  await ensureTocken()
  // prepare the API request
  let apiQuery = '?'
  if (query.tags) {
    const tags = helper.parseCommaSeparatedString(query.tyags)
    apiQuery += tags.map(t => `tags=${t}`).join('&')
  }
  if (query.tagsJoin && query.tags) {
    apiQuery += `&tagsJoin=${query.tagsJoin}`
  }
  const options = {
    method: 'get',
    url: `${config.MAMBO_DOMAIN_URL}/api/v1/${query.site || config.MAMBO_DEFAULT_SITE}/users/${encodeURIComponent(handle)}/rewards${apiQuery}`,
    headers: {
      'Authorization': `Bearer ${MAMBO_ACCESS_TOKEN.access_token}`
    }
  }

  return axios(options)
    .then(rsp => {
      if (currentUser && (currentUser.isMachine || helper.hasAdminRole(currentUser))) {
        // Admins and M2Ms get full respone
        return rsp.data
      } else {
        // for anonymous access filter the returned fields - better security
        return rsp.data.map(reward => _.pick(reward, constants.MAMBO_GET_REWARDS_ALLOWED_FIELDS))
      }
    })
    .catch(rsp => {
      // refresh the token if expired...
      if (rsp.response.status === 401) {
        MAMBO_ACCESS_TOKEN = null
        return getMemberRewards(handle, query)
      }
      logger.debug('getMemberRewards error', rsp)
      throw rsp
    })
}

getMemberRewards.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    site: Joi.string(),
    tags: Joi.string(),
    tagsJoin: Joi.string().valid('hasAllOf', 'hasAnyOf')
  })
}

module.exports = {
  getMemberRewards
}

logger.buildService(module.exports)
