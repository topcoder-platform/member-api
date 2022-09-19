/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const eshelper = require('../common/eshelper')
const logger = require('../common/logger')

const MEMBER_FIELDS = ['userId', 'handle', 'handleLower', 'firstName', 'lastName',
  'status', 'addresses', 'photoURL', 'homeCountryCode', 'competitionCountryCode',
  'description', 'email', 'tracks', 'maxRating', 'wins', 'createdAt', 'createdBy',
  'updatedAt', 'updatedBy', 'skills', 'stats']

const MEMBER_AUTOCOMPLETE_FIELDS = ['userId', 'handle', 'handleLower', 'firstName', 'lastName',
  'status', 'email', 'createdAt', 'updatedAt']

var MEMBER_STATS_FIELDS = ['userId', 'handle', 'handleLower', 'maxRating',
  'challenges', 'wins', 'DEVELOP', 'DESIGN', 'DATA_SCIENCE', 'COPILOT']

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

  // search for the members based on query
  const docsMembers = await eshelper.getMembers(query, esClient, currentUser)

  // get the total
  const total = eshelper.getTotal(docsMembers)
  let results = []
  if (total > 0) {
    // extract member profiles from hits
    const members = _.map(docsMembers.hits.hits, (item) => item._source)

    // search for a list of members
    query.handlesLower = _.map(members, 'handleLower')

    // get skills for the members fetched
    const docsSkiills = await eshelper.getMembersSkills(query, esClient)
    // extract member skills from hits
    const mbrsSkills = _.map(docsSkiills.hits.hits, (item) => item._source)

    // get stats for the members fetched
    const docsStats = await eshelper.getMembersStats(query, esClient)
    // extract data from hits
    const mbrsSkillsStats = _.map(docsStats.hits.hits, (item) => item._source)

    // merge members profile and there skills
    const mergedMbrSkills = _.merge(_.keyBy(members, 'userId'), _.keyBy(mbrsSkills, 'userId'))
    let resultMbrSkills = _.values(mergedMbrSkills)
    resultMbrSkills = _.map(resultMbrSkills, function (item) {
      if (!item.skills) {
        item.skills = {}
      }
      return item
    })

    // merge overall members and stats
    const mbrsSkillsStatsKeys = _.keyBy(mbrsSkillsStats, 'userId')
    const resultMbrsSkillsStats = _.map(resultMbrSkills, function (item) {
      if (mbrsSkillsStatsKeys[item.userId]) {
        item.stats = []
        if (mbrsSkillsStatsKeys[item.userId].maxRating) {
          // add the maxrating
          item.maxRating = mbrsSkillsStatsKeys[item.userId].maxRating
          // set the rating color
          if (item.maxRating.hasOwnProperty('rating')) {
            item.maxRating.ratingColor = helper.getRatingColor(item.maxRating.rating)
          }
        }
        // clean up stats fileds and filter on stats fields
        item.stats.push(_.pick(mbrsSkillsStatsKeys[item.userId], MEMBER_STATS_FIELDS))
      } else {
        item.stats = []
      }
      return item
    })
    // sort the data
    results = _.orderBy(resultMbrsSkillsStats, ['handleLower'], [query.sort])
    // filter member based on fields
    results = _.map(results, (item) => _.pick(item, fields))
  }
  return { total: total, page: query.page, perPage: query.perPage, result: results }
}

searchMembers.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    handleLower: Joi.string(),
    handlesLower: Joi.array(),
    handle: Joi.string(),
    handles: Joi.array(),
    userId: Joi.number(),
    userIds: Joi.array(),
    term: Joi.string(),
    fields: Joi.string(),
    page: Joi.page(),
    perPage: Joi.perPage(),
    sort: Joi.sort()
  })
}

/**
 * members autocomplete.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} query the query parameters
 * @returns {Object} the autocomplete result
 */
async function autocomplete (currentUser, query) {
  // validate and parse fields param
  let fields = helper.parseCommaSeparatedString(query.fields, MEMBER_AUTOCOMPLETE_FIELDS) || MEMBER_AUTOCOMPLETE_FIELDS
  // if current user is not autocomplete role and not M2M, then exclude the autocomplete/M2M only fields
  if (!currentUser || (!currentUser.isMachine && !helper.hasAutocompleteRole(currentUser))) {
    fields = _.without(fields, ...config.SEARCH_SECURE_FIELDS)
    // MEMBER_AUTOCOMPLETE_FIELDS = _.without(MEMBER_AUTOCOMPLETE_FIELDS, ...config.STATISTICS_SECURE_FIELDS)
  }
  // get suggestion based on querys term
  const docsSuggestions = await eshelper.getSuggestion(query, esClient, currentUser)
  if (docsSuggestions.hasOwnProperty('suggest')) {
    const totalSuggest = docsSuggestions.suggest['handle-suggestion'][0].options.length
    var results = docsSuggestions.suggest['handle-suggestion'][0].options
    // custom filter & sort
    let regex = new RegExp(`^${query.term}`, `i`)
    results = results
      .filter(x => regex.test(x.payload.handle))
      .sort((a, b) => a.payload.handle.localeCompare(b.payload.handle))
    // filter member based on fields
    results = _.map(results, (item) => _.pick(item.payload, fields))
    // custom pagination
    results = helper.paginate(results, query.perPage, query.page - 1)
    return { total: totalSuggest, page: query.page, perPage: query.perPage, result: results }
  }
  return { total: 0, page: query.page, perPage: query.perPage, result: [] }
}

autocomplete.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    term: Joi.string(),
    fields: Joi.string(),
    page: Joi.page(),
    perPage: Joi.perPage(),
    size: Joi.size(),
    sort: Joi.sort()
  })
}

module.exports = {
  searchMembers,
  autocomplete
}

logger.buildService(module.exports)
