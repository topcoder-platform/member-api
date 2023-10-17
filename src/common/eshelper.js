/**
 * This file defines helper methods
 */
const _ = require('lodash')
const config = require('config')
const { BOOLEAN_OPERATOR } = require('../../app-constants')

/**
 * Fetch members profile form ES
 * @param {Object} query the HTTP request query
 * @returns {Object} members and total
 */
async function getMembers (query, esClient, currentUser) {
  const handles = _.isArray(query.handles) ? query.handles : []
  const handlesLower = _.isArray(query.handlesLower) ? query.handlesLower : []
  var userIds = _.isArray(query.userIds) ? query.userIds : []
  // construct ES query for members profile
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
  if (query.userId) {
    boolQueryMembers.push({ match_phrase: { userId: query.userId } })
  }
  if (query.handleLower) {
    boolQueryMembers.push({ match_phrase: { handleLower: query.handleLower } })
  }
  if (query.handle) {
    boolQueryMembers.push({ match_phrase: { handle: query.handle } })
  }
  if (query.email) {
    boolQueryMembers.push({ match_phrase: { email: query.email } })
  }
  if (userIds.length > 0) {
    boolQueryMembers.push({ query: { terms: { userId: userIds } } })
  }
  if (handlesLower.length > 0) {
    boolQueryMembers.push({ query: { terms: { handleLower: handlesLower } } })
  }
  if (handles.length > 0) {
    boolQueryMembers.push({ query: { terms: { handle: handles } } })
  }
  boolQueryMembers.push({ match_phrase: { status: 'ACTIVE' } })
  if (boolQueryMembers.length > 0) {
    esQueryMembers.body.query = {
      bool: {
        filter: boolQueryMembers
      }
    }
  }
  // search with constructed query
  let docsMembers = await esClient.search(esQueryMembers)
  return docsMembers
}

/**
 * Search members by skills
 * @param {Object} query the HTTP request query
 * @returns {Object} members skills
 */
async function searchBySkills (query, esClient) {
  // construct ES query for skills
  const esQuerySkills = {
    index: config.get('ES.MEMBER_SKILLS_ES_INDEX'),
    type: config.get('ES.MEMBER_SKILLS_ES_TYPE'),
    body: {
      sort: [{ userHandle: { order: query.sort } }]
    }
  }
  const boolQuerySkills = []

  if (query.handlesLower) {
    boolQuerySkills.push({ query: { terms: { handleLower: query.handlesLower } } })
  }
  esQuerySkills.body.query = {
    bool: {
      filter: boolQuerySkills
    }
  }
  // search with constructed query
  const docsSkills = await esClient.search(esQuerySkills)
  return docsSkills
}

/**
 * Fetch members skills form ES
 * @param {Object} query the HTTP request query
 * @returns {Object} members skills
 */
async function getMembersSkills (query, esClient) {
  // construct ES query for skills
  const esQuerySkills = {
    index: config.get('ES.MEMBER_SKILLS_ES_INDEX'),
    type: config.get('ES.MEMBER_SKILLS_ES_TYPE'),
    body: {
      sort: [{ userHandle: { order: query.sort } }]
    }
  }
  const boolQuerySkills = []

  if (query.handlesLower) {
    boolQuerySkills.push({ query: { terms: { handleLower: query.handlesLower } } })
  }
  esQuerySkills.body.query = {
    bool: {
      filter: boolQuerySkills
    }
  }
  // search with constructed query
  const docsSkills = await esClient.search(esQuerySkills)
  return docsSkills
}

/**
 * Fetch members stats form ES
 * @param {Object} query the HTTP request query
 * @returns {Object} members stats
 */
async function getMembersStats (query, esClient) {
  const searchResults = {hits:{hits:[]}}
  const responseQueue = []

  // construct ES query for stats
  const esQueryStats = {
    index: config.get('ES.MEMBER_STATS_ES_INDEX'),
    type: config.get('ES.MEMBER_STATS_ES_TYPE'),
    size: 10000,
    scroll: '90s',
    body: {
      sort: [{ handleLower: { order: query.sort } }]
    }
  }
  const boolQueryStats = []
  if (query.handlesLower) {
    boolQueryStats.push({ query: { terms: { handleLower: query.handlesLower } } })
    boolQueryStats.push({ match_phrase: { groupId: 10 } })
  }
  esQueryStats.body.query = {
    bool: {
      filter: boolQueryStats
    }
  }


  // search with constructed query
  const response = await esClient.search(esQueryStats)

  responseQueue.push(response)
  while (responseQueue.length) {
    const body = responseQueue.shift()
    // collect the titles from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
      //searchResults.push(hit._source.quote)
    })

    // check to see if we have collected all of the quotes
    if (body.hits.total === searchResults.hits.hits.length) {
      console.log('Number of stat matches', searchResults.hits.hits.length)
      searchResults.hits.total=body.hits.total
      break
    }

    // get the next response if there are more quotes to fetch
    responseQueue.push(
      await esClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults
}

/**
 * Fetch members traits from ES, for multiple members
 * Used by the talent-search app
 * @param {Object} query the HTTP request query
 * @returns {Object} members traits
 */
async function getMemberTraits (query, esClient) {
  const searchResults = {hits:{hits:[]}}
  const responseQueue = []

  // construct ES query for traits
  const esQueryTraits = {
    index: config.get('ES.MEMBER_TRAIT_ES_INDEX'),
    type: config.get('ES.MEMBER_TRAIT_ES_TYPE'),
    size: 10000,
    scroll: '90s',
    body: {
      sort: [{ handleLower: { order: query.sort } }]
    }
  }
  const boolQueryTraits = []
  if (query.memberIds) {
    boolQueryTraits.push({ query: { terms: { userId: query.memberIds } } })
  }
  esQueryTraits.body.query = {
    bool: {
      filter: boolQueryTraits
    }
  }

  // search with constructed query
  const response = await esClient.search(esQueryTraits)

  responseQueue.push(response)
  while (responseQueue.length) {
    const body = responseQueue.shift()
    // collect the titles from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
      //searchResults.push(hit._source.quote)
    })

    // check to see if we have collected all of the traits
    if (body.hits.total === searchResults.hits.hits.length) {
      console.log('Number of trait matches:', searchResults.hits.hits.length)
      searchResults.hits.total=body.hits.total
      break
    }

    // get the next response if there are more traits to fetch
    responseQueue.push(
      await esClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults
}

/**
 * Fetch member profile suggestion from ES
 * @param {Object} query the HTTP request query
 * @returns {Object} suggestion
 */
async function getSuggestion (query, esClient, currentUser) {
  // construct ES query for members profile suggestion
  let esSuggestionMembers = {
    index: config.get('ES.MEMBER_PROFILE_ES_INDEX'),
    type: config.get('ES.MEMBER_PROFILE_ES_TYPE'),
    size: query.perPage,
    from: (query.page - 1) * query.perPage,
    body: {}
  }
  if (query.term) {
    esSuggestionMembers.body.suggest = {
      'handle-suggestion': {
        text: query.term,
        completion: {
          size: query.size,
          field: 'handleSuggest'
        }
      }
    }
  }
  // search with constructed query
  let docsSuggestionMembers = await esClient.search(esSuggestionMembers)
  return docsSuggestionMembers
}

/**
 * Gets the members skills documents matching the provided criteria from Elasticsearch
 * @param skillIds
 * @param skillsBooleanOperator
 * @param page
 * @param perPage
 * @param esClient
 * @returns {Promise<*>}
 */
async function searchMembersSkills (skillIds, skillsBooleanOperator, page, perPage, esClient) {
  const searchResults = {hits:{hits:[]}}
  const responseQueue = []

  // construct ES query for members skills
  const esQuerySkills = {
    index: config.get('ES.MEMBER_PROFILE_ES_INDEX'),
    type: config.get('ES.MEMBER_PROFILE_ES_TYPE'),
    size: 10000,
    scroll: '90s',
    _source:[  
      'userId',
      'skills.id',
      'skills.levels',
      'skills.name',
      'handle',
      'handleLower',
      'photoURL',
      'firstName',
      'lastName',
      'homeCountryCode',
      'addresses',
      'lastLoginDate'
    ],
    body: {
      query: {
        bool: {
          filter: { bool: {} }
        }
      }
    }
  }

  const mustMatchQuery = [] // will contain the filters with AND operator
  const shouldFilter = [] // will contain the filters with OR operator

  //NOTE - we will need to update this once we refactor the skills associated with members to remove the `emsi` wording
  if (skillsBooleanOperator === BOOLEAN_OPERATOR.AND) {
    for (const skillId of skillIds) {
      const matchPhrase = {}
      matchPhrase[`skills.id`] = `${skillId}`
      mustMatchQuery.push({
        match_phrase: matchPhrase
      })
    }
  } else {
    for (const skillId of skillIds) {
      const matchPhrase = {}
      matchPhrase[`skills.id`] = `${skillId}`
      shouldFilter.push({
        match_phrase: matchPhrase // eslint-disable-line
      })
    }
  }

  if (mustMatchQuery.length > 0) {
    esQuerySkills.body.query.bool.filter.bool.must = mustMatchQuery
  }

  if (shouldFilter.length > 0) {
    esQuerySkills.body.query.bool.filter.bool.should = shouldFilter
  }
  
  // search with constructed query
  const response = await esClient.search(esQuerySkills)

  responseQueue.push(response)
  
  while (responseQueue.length) {
    const body = responseQueue.shift()
    // collect the titles from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
    })

    // check to see if we have collected all of the quotes
    if (body.hits.total === searchResults.hits.hits.length) {
      console.log('Number of members matching skills:', searchResults.hits.hits.length)
      searchResults.hits.total=body.hits.total
      break
    }

    // get the next response if there are more quotes to fetch
    responseQueue.push(
      await esClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults
}

/**
 * Get total items
 * @param {Object} docs the HTTP request query
 * @returns {Object} total
 */
function getTotal (docs) {
  let total = docs.hits.total
  if (_.isObject(total)) {
    total = total.value || 0
  }
  return total
}

module.exports = {
  getMembers,
  getMembersSkills,
  getMembersStats,
  getMemberTraits,
  getSuggestion,
  getTotal,
  searchMembersSkills,
}
