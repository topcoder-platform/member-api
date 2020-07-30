/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const statisticsService = require('./StatisticsService')
const memberService = require('./MemberService')

const MEMBER_FIELDS = ['userId', 'handle', 'handleLower', 'firstName', 'lastName',
  'status', 'addresses', 'photoURL', 'homeCountryCode', 'competitionCountryCode',
  'description', 'email', 'tracks', 'maxRating', 'wins', 'createdAt', 'createdBy',
  'updatedAt', 'updatedBy', 'skills', 'stats']

var MEMBER_STATS_FIELDS = ['userId', 'handle', 'handleLower', 'maxRating',
  'challenges', 'wins','DEVELOP', 'DESIGN', 'DATA_SCIENCE', 'copilot']

const esClient = helper.getESClient()

/**
 * Search members.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} query the query parameters
 * @returns {Object} the search result
 */
async function searchMembers (currentUser, query) {
  // validate and parse fields param
  let fields = helper.parseCommaSeparatedString(query.fields, MEMBER_FIELDS) || MEMBER_FIELDS
  // if current user is not admin and not M2M, then exclude the admin/M2M only fields
  if (!currentUser || (!currentUser.isMachine && !helper.hasAdminRole(currentUser))) {
    fields = _.without(fields, ...config.SEARCH_SECURE_FIELDS)
    MEMBER_STATS_FIELDS = _.without(MEMBER_STATS_FIELDS, ...config.STATISTICS_SECURE_FIELDS)
  }

  //// construct ES query for members profile
  let esQueryMembers = {
    index: config.get('ES.MEMBER_PROFILE_ES_INDEX'),
    type: config.get('ES.MEMBER_PROFILE_ES_TYPE'),
    size: query.perPage,
    from: (query.page - 1) * query.perPage,
    body: {
      sort: [{ handle: { order: query.sort } }]
    }
  }
  const boolQueryMembers = []
  if (query.query) {
    // list of field allowed to be queried for
    const allowedQueryFields = ['handle', 'handleLower', 'firstName', 'lastName', 'homeCountryCode', 'competitionCountryCode', 'tracks']
    boolQueryMembers.push({
      simple_query_string: {
        query: query.query,
        fields: allowedQueryFields,
        default_operator: 'and'
      }
    })
  }
  if (query.handleLower) {
    boolQueryMembers.push({ match_phrase: { handleLower: query.handleLower } })
  }
  if (query.handle) {
    boolQueryMembers.push({ match_phrase: { handle: query.handle } })
  }
  if (query.userId) {
    boolQueryMembers.push({ match_phrase: { userId: query.userId } })
  }
  boolQueryMembers.push({ match_phrase: { status: "ACTIVE" } })
  if (boolQueryMembers.length > 0) {
    esQueryMembers.body.query = {
      bool: {
        filter: boolQueryMembers
      }
    }
  }
  // search with constructed query
  const docsMembers = await esClient.search(esQueryMembers)
  // extract data from hits
  const total = docsMembers.hits.total
  if (_.isObject(total)) {
    total = total.value || 0
  }
  const members = _.map(docsMembers.hits.hits, (item) => item._source)
  
  //// construct ES query for skills
  const esQuerySkills = {
    index: config.get('ES.MEMBER_SKILLS_ES_INDEX'),
    type: config.get('ES.MEMBER_SKILLS_ES_TYPE'),
    body: {
      sort: [{ userHandle: { order: query.sort } }]
    }
  }
  const boolQuerySkills = []
  // search for a list of members
  const membersHandles = _.map(members, 'handleLower')
  boolQuerySkills.push({ query: { terms : { handleLower: membersHandles } } } )
  esQuerySkills.body.query = {
    bool: {
      filter: boolQuerySkills
    }
  }
  // search with constructed query
  const docsSkiills = await esClient.search(esQuerySkills)
  // extract data from hits
  const mbrsSkills = _.map(docsSkiills.hits.hits, (item) => item._source)

  //// construct ES query for stats
  const esQueryStats = {
    index: config.get('ES.MEMBER_STATS_ES_INDEX'),
    type: config.get('ES.MEMBER_STATS_ES_TYPE'),
    body: {
      sort: [{ handleLower: { order: query.sort } }]
    }
  }
  const boolQueryStats = []
  boolQueryStats.push({ query: { terms : { handleLower: membersHandles } } })
  boolQueryStats.push({ match_phrase: { groupId : 10 } })
  esQueryStats.body.query = {
    bool: {
      filter: boolQueryStats
    }
  }
  // search with constructed query
  const docsStats = await esClient.search(esQueryStats)
  // extract data from hits
  const mbrsSkillsStats = _.map(docsStats.hits.hits, (item) => item._source)

  //// merge members profile and there skills
  const mergedMbrSkills = _.merge(_.keyBy(members, 'userId'), _.keyBy(mbrsSkills, 'userId'))
  let resultMbrSkills = _.values(mergedMbrSkills)
  resultMbrSkills = _.map(resultMbrSkills, function(item) {
    if (!item.skills) {
      item.skills = {}
    }
    return item;
  })

  //// merge overall members and stats
  const mbrsSkillsStatsKeys = _.keyBy(mbrsSkillsStats, 'userId')
  const resultMbrsSkillsStats = _.map(resultMbrSkills, function(item) {
      if (mbrsSkillsStatsKeys[item.userId]) {
        item.stats = []
        if (mbrsSkillsStatsKeys[item.userId].maxRating) {
          // add the maxrating
          item.maxRating = mbrsSkillsStatsKeys[item.userId].maxRating
          // set the rating color
          if (item.maxRating.hasOwnProperty("rating")) {
            item.maxRating.ratingColor = helper.getRatingColor(item.maxRating.rating)
          }
        }
        // clean up stats fileds and filter on stats fields
        item.stats.push(_.pick(mbrsSkillsStatsKeys[item.userId], MEMBER_STATS_FIELDS))
      } else {
        item.stats = []
      }
      return item;
    })
  
  // filter member and skills fields 
  let results = _.map(resultMbrsSkillsStats, (item) => _.pick(item, fields))

  return { total, page: query.page, perPage: query.perPage, result: results }
}

searchMembers.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    query: Joi.string(),
    handleLower: Joi.string(),
    handle: Joi.string(),
    userId: Joi.number(),
    fields: Joi.string(),
    page: Joi.page(),
    perPage: Joi.perPage(),
    sort: Joi.sort(),
  })
}

module.exports = {
  searchMembers
}

logger.buildService(module.exports)
