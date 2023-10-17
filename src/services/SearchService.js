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
  'updatedAt', 'updatedBy', 'skills', 'stats', 'verified', 'loginCount', 'lastLoginDate',
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

async function addStats(results, query){
    console.log("Adding stats to results")
    // get stats for the members fetched
    const docsStats = await eshelper.getMembersStats(query, esClient)
    // extract data from hits
    const mbrsSkillsStats = _.map(docsStats.hits.hits, (item) => item._source)

    // merge overall members and stats
    const mbrsSkillsStatsKeys = _.keyBy(mbrsSkillsStats, 'userId')
    const resultsWithStats = _.map(results, function (item) {
      item.numberOfChallengesWon = 0;
      item.numberOfChallengesPlaced = 0;
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
        if (mbrsSkillsStatsKeys[item.userId].wins > item.numberOfChallengesWon) {
          item.numberOfChallengesWon = mbrsSkillsStatsKeys[item.userId].wins
        }

        item.numberOfChallengesPlaced = mbrsSkillsStatsKeys[item.userId].challenges

        // clean up stats fields and filter on stats fields
        item.stats.push(_.pick(mbrsSkillsStatsKeys[item.userId], MEMBER_STATS_FIELDS))
      } else {
        item.stats = []
      }
      return item
    })

    return resultsWithStats
}

async function addNamesAndHandleAppearance(results, query){

    // get stats for the members fetched
    const docsTraits = await eshelper.getMemberTraits(query, esClient)
    // extract data from hits
    const mbrsTraits = _.map(docsTraits.hits.hits, (item) => item._source)

    // Pull out availableForGigs to add to the search results, for talent search
    // TODO - can we make this faster / more efficient?
    let resultsWithTraits = _.map(results, function (item) {
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

    return resultsWithTraits
}

async function addVerifiedFlag(results){
  // Get the verification data from Looker
  for (let i = 0; i < results.length; i += 1) {
    if (await lookerService.isMemberVerified(results[i].userId)) {
      results[i].verified = true
    }
    else {
      results[i].verified = false
    }
  }
  return results
}

async function addSkillScore(results, query){

    // get stats for the members fetched
    const docsTraits = await eshelper.getMemberTraits(query, esClient)
    // extract data from hits
    const mbrsTraits = _.map(docsTraits.hits.hits, (item) => item._source)

    // Pull out availableForGigs to add to the search results, for talent search
    let resultsWithScores = _.map(results, function (item) {
      if(!item.skills){
        item.skillScore = 0
        return item
      }
      let score = 0.0
      for (const skillId of query.skillIds) {
        for(const skill of item.skills){
          if(skillId === skill.id){
            // We do this because we don't know what order the skill sources will be in.  Not ideal
            let challengeWin = false
            let selfPicked = false
            for(const level of skill.levels){
              if(level.name === 'verified'){
                challengeWin = true
              }
              else if(level.name === 'self-declared'){
                selfPicked = true
              }
            }
  
            if(challengeWin){
              score = score + 1.0
            }
            else if(selfPicked){
              score = score + 0.5
            }
          }
        }
      }
      console.log('Member: %s sum score skill match score: %d', item.handle, score)
      item.skillScore = Math.round(score / query.skillIds.length * 100) / 100

      item.traits = []
      let memberTraits = _.filter(mbrsTraits, ['userId', item.userId])

      // While we go through the member traits to pull out availableForGigs and
      // namesAndHandleAppearence, we'll also calculate profile completeness values
      // for TAL-77
      profileData = {}
      profileData.gigAvailability = null
      profileData.bio = false
      profileData.profilePicture = false
      profileData.workHistory = false
      profileData.education = false
    
      _.forEach(memberTraits, (trait) => {
        if (trait.traitId == "personalization") {
          _.forEach(trait.traits.data, (data) => {
            // Add these traits because they are used in the skill search results UI
            if (data.availableForGigs != null) {
              item.availableForGigs = data.availableForGigs
              profileData.gigAvailability = true
            }
            if (data.namesAndHandleAppearance != null) {
              item.namesAndHandleAppearance = data.namesAndHandleAppearance
            }
          })
        }
        if(item.traitId=="education" && item.traits.data.length > 0 && profileData.education == false){
          profileData.education = true
        }
    
        if(item.traitId=="work" && item.traits.data.length > 0 && profileData.workHistory==false){
          profileData.workHistory = true
        }
    
      })

      if(item.description && profileData.bio==false) {
        profileData.bio = true
      }
      if(item.photoURL){
        profileData.profilePicture = true
      }

      // TAL-77 : missing avatar, reduce match by 4%
      if(!profileData.profilePicture){
        item.skillScore = item.skillScore - 0.04
      }

      // TAL-77 : missing experience, reduce match by 2%
      if(!profileData.workHistory){
        item.skillScore = item.skillScore - 0.02
      }

      // TAL-77 : missing education, reduce match by 2%
      if(!profileData.education){
        item.skillScore = item.skillScore - 0.02
      }

      // TAL-77 : missing bio, reduce match by 1%
      if(!profileData.bio){
        item.skillScore = item.skillScore - 0.01
      }

      // TAL-77 : gig work is undefined/null, reduce match by 1%
      if(!profileData.gigAvailability){
        item.skillScore = item.skillScore - 0.01
      }

      // 1696118400000 is the epoch value for Oct 1, 2023, which is when we deployed the change to set the last login date when a user logs in
      // So, we use this as the baseline for the user if they don't have a last login date.
      
      let lastLoginDate = 1696118400000
      if(item.lastLoginDate){
        lastLoginDate = item.lastLoginDate
      }

      let loginDiff = Date.now() - lastLoginDate
      // For diff calculation (30 days, 24 hours, 60 minutes, 60 seconds, 1000 milliseconds)
      let monthLength = 30 * 24 * 60 * 60 * 1000

      //If logged in > 5 month ago
      if(loginDiff > (5 * monthLength)){
        item.skillScore = item.skillScore - 0.5
      }
      // Logged in more than 4 months ago, but less than 5
      else if(loginDiff > (4 * monthLength)){
        item.skillScore = item.skillScore - 0.4
      }
      // Logged in more than 3 months ago, but less than 4
      else if(loginDiff > (3 * monthLength)){
        item.skillScore = item.skillScore - 0.3
      }
      // Logged in more than 2 months ago, but less than 3
      else if(loginDiff > (2 * monthLength)){
        item.skillScore = item.skillScore - 0.2
      }
      // Logged in more than 1 month ago, but less than 2
      else if(loginDiff > (1 * monthLength)){
        item.skillScore = item.skillScore - 0.1
      }
      if(item.skillScore < 0){
        item.skillScore = 0
      }

      item.skillScore = Math.round(item.skillScore * 100) / 100
      console.log('Member: %s Final skill score: %d', item.handle, item.skillScore)
    
      // Default names and handle appearance
      // https://topcoder.atlassian.net/browse/MP-325
      if(!item.namesAndHandleAppearance){
        item.namesAndHandleAppearance = 'namesAndHandle'
      }
      return item
    })

    return resultsWithScores
  // Calculate the skillScore value for each skill search results
  // https://topcoder.atlassian.net/browse/TAL-8
  // https://topcoder.atlassian.net/browse/TAL-77
  results.forEach(function (result) {
    
    
  })
  return results
}

// The default search order, used by general handle searches
function handleSearchOrder(results, query){
  // Sort the results for default searching
  results = _.orderBy(results, [query.sortBy, "handleLower"], [query.sortOrder])
  return results
}

// The skill search order, which has a secondary sort of the number of
// Topcoder-verified skills, in descending order (where level.name===verified)
function skillSearchOrder(results, query){
  results = _.orderBy(results, [query.sortBy, function (member) {
    challengeWinSkills = _.filter(member.skills, 
      function(skill) {
        skill.levels.forEach(level => {
          if(level.name==="verified"){
            return true
          }
        });
      })
    return challengeWinSkills.length
    }], [query.sortOrder, 'desc'])
  return results
}

async function fillMembers(docsMembers, query, fields, skillSearch=false) {
  // get the total
  const total = eshelper.getTotal(docsMembers)

  let results = []
  if (total > 0) {
    // extract member profiles from hits
    results = _.map(docsMembers.hits.hits, (item) => item._source)

    // search for a list of members
    query.handlesLower = _.map(results, 'handleLower')
    query.memberIds = _.map(results, 'userId')
    
    // Include the stats by default, but allow them to be ignored with ?includeStats=false
    // This is for performance reasons - pulling the stats is a bit of a resource hog
    if(!query.includeStats || query.includeStats=="true"){
      results = await addStats(results, query)
    }

    // Add the name and handle appearance and verified flag *only* to each page, for performance
    query.handlesLower = _.map(results, 'handleLower')
    query.memberIds = _.map(results, 'userId')

    // Sort in slightly different secondary orders, depending on if
    // this is a skill search or handle search
    if(skillSearch){
      results = await addSkillScore(results, query)
      results = skillSearchOrder(results, query)
    }
    else{
      results = handleSearchOrder(results, query)
    }
    
    results = helper.paginate(results, query.perPage, query.page - 1)
    // filter member based on fields
  
    // Note that, as part of the skill search, we get the traits for all results, so we apply
    // the names and handle appearence in addSkillScore above, so we can skip it here to avoid
    // doing the call to the traits ES index twice
    if(!skillSearch){
      results = await addNamesAndHandleAppearance(results, query)
    }

    results = await addVerifiedFlag(results)
    
    // filter member based on fields
    results = _.map(results, (item) => _.pick(item, fields))
  }

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
  try {
    const esClient = await helper.getESClient()
    let skillIds = await helper.getParamsFromQueryAsArray(query, 'id')
    query.skillIds = skillIds
    const result = searchMembersBySkillsWithOptions(currentUser, query, skillIds, BOOLEAN_OPERATOR.AND, query.page, query.perPage, query.sortBy, query.sortOrder, esClient)
    return result
  } catch (e) {
    console.log("ERROR WHEN SEARCHING")
    console.log(e)
    return { total: 0, page: query.page, perPage: query.perPage, result: [] }
  }
}

searchMembersBySkills.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    id: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
    page: Joi.page(),
    perPage: Joi.perPage(),
    includeStats: Joi.string(),
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

  // We pass in "true" so that fillMembers knows we're doing a skill sort so the secondary
  // sort order (after skillScore) is the number of verified skills in descending order
  let response = await fillMembers(membersSkillsDocs, query, fields, true)

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
