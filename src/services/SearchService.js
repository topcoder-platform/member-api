/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const statisticsService = require('./StatisticsService')

const MEMBER_FIELDS = ['userId', 'handle', 'handleLower', 'firstName', 'lastName',
  'status', 'addresses', 'photoURL', 'homeCountryCode', 'competitionCountryCode',
  'description', 'email', 'tracks', 'maxRating', 'wins', 'createdAt', 'createdBy',
  'updatedAt', 'updatedBy', 'skills', 'stats']

// exclude 'skills' and 'stats'
const DEFAULT_MEMBER_FIELDS = MEMBER_FIELDS.slice(0, MEMBER_FIELDS.length - 2)

const esClient = helper.getESClient()

/**
 * Search members.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} query the query parameters
 * @returns {Object} the search result
 */
async function searchMembers (currentUser, query) {
  // validate and parse fields param
  let fields = helper.parseCommaSeparatedString(query.fields, MEMBER_FIELDS) || DEFAULT_MEMBER_FIELDS
  // if current user is not admin and not M2M, then exclude the admin/M2M only fields
  if (!currentUser || (!currentUser.isMachine && !helper.hasAdminRole(currentUser))) {
    fields = _.without(fields, ...config.SEARCH_SECURE_FIELDS)
  }
  // construct ES query
  const esQuery = {
    index: config.get('ES.ES_INDEX'),
    type: config.get('ES.ES_TYPE'),
    size: query.perPage,
    from: (query.page - 1) * query.perPage, // Es Index starts from 0
    body: {
      sort: [{ handle: { order: 'asc' } }]
    }
  }
  const boolQuery = []
  if (query.query) {
    // Allowing - 'homeCountryCode', 'handle', 'tracks', 'handleLower', 'firstName', 'lastName'
    var notAllowedQueryFields = ['createdAt', 'createdBy', 'maxRating', 'photoURL', 'skills', 'stats', 'updatedAt', 'updatedBy', 'userId', 'wins', 'status', 'description', 'email']
    var allowedQueryFields = _.without(fields, ...notAllowedQueryFields)
    boolQuery.push({
      simple_query_string: {
        query: query.query,
        fields: allowedQueryFields,
        default_operator: 'and'
      }
    })
  }
  if (query.handleLower) {
    boolQuery.push({ match_phrase: { handleLower: query.handleLower } })
  }
  if (query.handle) {
    boolQuery.push({ match_phrase: { handle: query.handle } })
  }
  if (query.userId) {
    boolQuery.push({ match_phrase: { userId: query.userId } })
  }
  if (query.status) {
    boolQuery.push({ match_phrase: { status: query.status } })
  }
  if (boolQuery.length > 0) {
    esQuery.body.query = {
      bool: {
        filter: boolQuery
      }
    }
  }
  // Search with constructed query
  const docs = await esClient.search(esQuery)
  // Extract data from hits
  let total = docs.hits.total
  if (_.isObject(total)) {
    total = total.value || 0
  }
  const result = _.map(docs.hits.hits, (item) => item._source)
  for (let i = 0; i < result.length; i += 1) {
    if (_.includes(fields, 'skills')) {
      // get skills
      const memberSkill = await statisticsService.getMemberSkills(currentUser, result[i].handleLower, {}, false)
      result[i].skills = memberSkill.skills
    }
    if (_.includes(fields, 'stats')) {
      // get statistics
      const memberStats = await statisticsService.getMemberStats(currentUser, result[i].handleLower, {}, false)
      if (memberStats) {
        // get stats
        result[i].stats = memberStats
        // update the maxRating
        if (_.includes(fields, 'maxRating')) {
          for (count = 0; count < result[i].stats.length; count++) {
            if (result[i].stats[count].hasOwnProperty("maxRating")) {
              result[i].maxRating = result[i].stats[count].maxRating
            }
            if (result[i].stats[count].hasOwnProperty("wins")) {
              result[i].wins = result[i].stats[count].wins
            }
          }
        }
      }
    }
    // select fields
    result[i] = _.pick(result[i], fields)
  }
  return { total, page: query.page, perPage: query.perPage, result }
}

searchMembers.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    query: Joi.string(),
    handleLower: Joi.string(),
    handle: Joi.string(),
    userId: Joi.number(),
    status: Joi.string(),
    fields: Joi.string(),
    page: Joi.page(),
    perPage: Joi.perPage()
  })
}

module.exports = {
  searchMembers
}

logger.buildService(module.exports)
