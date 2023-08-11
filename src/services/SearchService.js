/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const eshelper = require('../common/eshelper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const { BOOLEAN_OPERATOR } = require('../../app-constants')
const LookerApi = require('../common/LookerApi')
const moment = require('moment')

const MEMBER_FIELDS = ['userId', 'handle', 'handleLower', 'firstName', 'lastName',
  'status', 'addresses', 'photoURL', 'homeCountryCode', 'competitionCountryCode',
  'description', 'email', 'tracks', 'maxRating', 'wins', 'createdAt', 'createdBy',
  'updatedAt', 'updatedBy', 'skills', 'stats', 'emsiSkills', 'verified',
  'numberOfChallengesWon', 'skillScore', 'numberOfChallengesPlaced','availableForGigs', 'namesAndHandleAppearance']

const MEMBER_SORT_BY_FIELDS = ['userId', 'country', 'handle', 'firstName', 'lastName',
  'numberOfChallengesWon', 'numberOfChallengesPlaced', 'skillScore']

const MEMBER_AUTOCOMPLETE_FIELDS = ['userId', 'handle', 'handleLower',
  'status', 'email', 'createdAt', 'updatedAt']

var MEMBER_STATS_FIELDS = ['userId', 'handle', 'handleLower', 'maxRating',
  'numberOfChallengesWon', 'numberOfChallengesPlaced',
  'challenges', 'wins', 'DEVELOP', 'DESIGN', 'DATA_SCIENCE', 'COPILOT']

const esClient = helper.getESClient()
const lookerService = new LookerApi(logger)

function omitMemberAttributes(currentUser, query, allowedValues) {
  // validate and parse fields param
  let fields = helper.parseCommaSeparatedString(query.fields, allowedValues) || allowedValues
  // if current user is not admin and not M2M, then exclude the admin/M2M only fields
  if (!currentUser || (!currentUser.isMachine && !helper.hasAdminRole(currentUser))) {
    fields = _.without(fields, ...config.MEMBER_SECURE_FIELDS)
  }
  // If the current user does not have an autocompleterole, remove the communication fields
  if (!currentUser || (!currentUser.isMachine && !helper.hasAutocompleteRole(currentUser))) {
    fields = _.without(fields, ...config.COMMUNICATION_SECURE_FIELDS)
  }
  return fields
}
/**
 * Search members.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} query the query parameters
 * @returns {Object} the search result
 */
async function searchMembers(currentUser, query) {
  fields = omitMemberAttributes(currentUser, query, MEMBER_FIELDS)

  if (query.email != null && query.email.length > 0) {
    if (currentUser == null) {
      throw new errors.UnauthorizedError('Authentication token is required to query users by email')
    }
    if (!helper.hasSearchByEmailRole(currentUser)) {
      throw new errors.BadRequestError('Admin role is required to query users by email')
    }
  }

  if (query.email != null && query.email.length > 0) {
    if (currentUser == null) {
      throw new errors.UnauthorizedError("Authentication token is required to query users by email");
    }
    if (!helper.hasSearchByEmailRole(currentUser)) {
      throw new errors.BadRequestError("Admin role is required to query users by email");
    }
  }

  // search for the members based on query
  const docsMembers = await eshelper.getMembers(query, esClient, currentUser)

  const searchData = await fillMembers(docsMembers, query, fields)

  // secure address data
  const canManageMember = currentUser && (currentUser.isMachine || helper.hasAdminRole(currentUser))
  if (!canManageMember) {
    searchData.result = _.map(searchData.result, res => helper.secureMemberAddressData(res))
  }

  return searchData
}

searchMembers.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    handleLower: Joi.string(),
    handlesLower: Joi.array(),
    handle: Joi.string(),
    handles: Joi.array(),
    email: Joi.string(),
    userId: Joi.number(),
    userIds: Joi.array(),
    term: Joi.string(),
    fields: Joi.string(),
    page: Joi.page(),
    perPage: Joi.perPage(),
    sort: Joi.sort()
  })
}

async function fillMembers(docsMembers, query, fields) {
  // get the total
  const total = eshelper.getTotal(docsMembers)

  let results = []
  if (total > 0) {
    // extract member profiles from hits
    const members = _.map(docsMembers.hits.hits, (item) => item._source)

    // search for a list of members
    query.handlesLower = _.map(members, 'handleLower')
    query.memberIds = _.map(members, 'userId')

    // get stats for the members fetched
    const docsTraits = await eshelper.getMemberTraits(query, esClient)
    // extract data from hits
    const mbrsTraits = _.map(docsTraits.hits.hits, (item) => item._source)

    // Pull out availableForGigs to add to the search results, for talent search
    // TODO - can we make this faster / more efficient?
    let resultMbrTraits = _.map(members, function (item) {
      item.traits = []
      let memberTraits = _.filter(mbrsTraits, ['userId', item.userId])
      _.forEach(memberTraits, (trait) => {
        if (trait.traitId == "personalization") {
          _.forEach(trait.traits.data, (data) => {
            if (data.availableForGigs != null) {
              item.availableForGigs = data.availableForGigs
            }
            if (data.namesAndHandleAppearance != null) {
              item.namesAndHandleAppearance = data.namesAndHandleAppearance
            }
          })
        }
      })
      // Default names and handle appearance
      // https://topcoder.atlassian.net/browse/MP-325
      if(!item.namesAndHandleAppearance){
        item.namesAndHandleAppearance = 'namesAndHandle'
      }
      else{
        console.log(item.namesAndHandleAppearance)
      }
      return item
    })


    // sort the data
    results = _.orderBy(resultMbrTraits, [query.sortBy, "handleLower"], [query.sortOrder])

    // Get the verification data from Looker
    for (let i = 0; i < results.length; i += 1) {
      if (await lookerService.isMemberVerified(results[i].userId)) {
        results[i].verified = true
      }
      else {
        results[i].verified = false
      }
    }

    // filter member based on fields
    results = _.map(results, (item) => _.pick(item, fields))
  }

  results = helper.paginate(results, query.perPage, query.page - 1)
  // filter member based on fields

  return { total: total, page: query.page, perPage: query.perPage, result: results }
}

// TODO - use some caching approach to replace these in-memory objects
/**
 * Search members by the given search query
 *
 * @param query The search query by which to search members
 *
 * @returns {Promise<[]>} The array of members matching the given query
 */
const searchMembersBySkills = async (currentUser, query) => {
  const esClient = await helper.getESClient()
  let skillIds = await helper.getParamsFromQueryAsArray(query, 'skillId')
  const result = searchMembersBySkillsWithOptions(currentUser, query, skillIds, BOOLEAN_OPERATOR.OR, query.page, query.perPage, query.sortBy, query.sortOrder, esClient)

  return result
}

searchMembersBySkills.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    skillId: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
    page: Joi.page(),
    perPage: Joi.perPage(),
    sortBy: Joi.string().valid(MEMBER_SORT_BY_FIELDS).default('skillScore'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
}

/**
 * Search members matching the given skills
 *
 * @param currentUser
 * @param skillsFilter
 * @param skillsBooleanOperator
 * @param page
 * @param perPage
 * @param sortBy
 * @param sortOrder
 * @param esClient
 * @returns {Promise<*[]|{total, perPage, numberOfPages: number, data: *[], page}>}
 */
const searchMembersBySkillsWithOptions = async (currentUser, query, skillsFilter, skillsBooleanOperator, page, perPage, sortBy, sortOrder, esClient) => {
  // NOTE, we remove stats only because it's too much data at the current time for the talent search app
  // We can add stats back in at some point in the future if we want to expand the information shown on the 
  // talent search app.  We still need to *get* the stats when searching to fill in the numberOfChallengesWon
  // and numberOfChallengesPlaced fields
  fields = omitMemberAttributes(currentUser, query, _.without(MEMBER_FIELDS, 'stats'))
  const emptyResult = {
    total: 0,
    page,
    perPage,
    numberOfPages: 0,
    data: []
  }
  if (_.isEmpty(skillsFilter)) {
    return emptyResult
  }

  const membersSkillsDocs = await eshelper.searchMembersSkills(skillsFilter, skillsBooleanOperator, page, perPage, esClient)
  let response = await fillMembers(membersSkillsDocs, query, fields)
  response.result = _.orderBy(response.result, sortBy, sortOrder)

  // secure address data
  const canManageMember = currentUser && (currentUser.isMachine || helper.hasAdminRole(currentUser))
  if (!canManageMember) {
    response.result = _.map(response.result, res => helper.secureMemberAddressData(res))
  }

  return response
}
/**
 * members autocomplete.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} query the query parameters
 * @returns {Object} the autocomplete result
 */
async function autocomplete(currentUser, query) {
  fields = omitMemberAttributes(currentUser, query, MEMBER_AUTOCOMPLETE_FIELDS)

  // get suggestion based on querys term
  const docsSuggestions = await eshelper.getSuggestion(query, esClient, currentUser)
  if (docsSuggestions.hasOwnProperty('suggest')) {
    const totalSuggest = docsSuggestions.suggest['handle-suggestion'][0].options.length
    var results = docsSuggestions.suggest['handle-suggestion'][0].options
    // custom filter & sort
    let regex = new RegExp(`^${query.term}`, `i`)
    // sometimes .payload is not defined. so use _source instead
    results = results.map(x => ({ ...x, payload: x.payload || x._source }))
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
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
}

module.exports = {
  searchMembers,
  searchMembersBySkills,
  autocomplete
}

logger.buildService(module.exports)
