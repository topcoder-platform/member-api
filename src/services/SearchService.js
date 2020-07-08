/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')

const MEMBER_FIELDS = ['maxRating', 'userId', 'firstName', 'lastName', 'description',
  'handle', 'status', 'competitionCountryCode', 'photoURL', 'tracks', 'createdAt', 'skills', 'stats']

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
    fields = _.without(fields, ...config.SEARCH_MEMBERS_ADMIN_ONLY_FIELDS)
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
    boolQuery.push({
      simple_query_string: {
        query: query.query,
        fields: ['userId', 'handle', 'handleLower', 'email', 'firstName', 'lastName', 'description',
          'competitionCountryCode', 'tracks'],
        default_operator: 'and'
      }
    })
  }
  if (query.handle) {
    boolQuery.push({ match_phrase: { handle: query.handle } })
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
      const skills = await helper.getEntityByHashKey('MemberSkill', 'userId', result[i].userId, true)
      // extract non-hidden skills to array
      result[i].skills = []
      _.forIn(skills.skills || {}, (value, key) => {
        if (!value.hidden) {
          result[i].skills.push({ name: key, score: value.score })
        }
      })
    }
    if (_.includes(fields, 'stats')) {
      // get statistics
      result[i].stats = await helper.getEntityByHashKey('MemberStats', 'userId', result[i].userId, true)
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
    handle: Joi.string(),
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
