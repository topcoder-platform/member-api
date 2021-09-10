/**
 * This file defines helper methods
 */
const _ = require('lodash')
const config = require('config')
const helper = require('./helper')
const moment = require('moment')

const client = helper.getESClient()

/**
 * Convert payload.
 * @param {Object} payload the payload
 * @return {Object} the converted payload
 */
function convertPayload (data) {
  const payload = _.cloneDeep(data)
  if (payload.hasOwnProperty('createdAt')) {
    if (payload.createdAt) {
      payload.createdAt = moment(payload.createdAt).valueOf()
    } else {
      delete payload.createdAt
    }
  }

  if (payload.hasOwnProperty('updatedAt')) {
    if (payload.updatedAt) {
      payload.updatedAt = moment(payload.updatedAt).valueOf()
    } else {
      delete payload.updatedAt
    }
  }

  if (payload.hasOwnProperty('emailVerifyTokenDate')) {
    if (payload.emailVerifyTokenDate) {
      payload.emailVerifyTokenDate = moment(payload.emailVerifyTokenDate).valueOf()
    } else {
      delete payload.emailVerifyTokenDate
    }
  }

  if (payload.hasOwnProperty('newEmailVerifyTokenDate')) {
    if (payload.newEmailVerifyTokenDate) {
      payload.newEmailVerifyTokenDate = moment(payload.newEmailVerifyTokenDate).valueOf()
    } else {
      delete payload.newEmailVerifyTokenDate
    }
  }

  if (payload.hasOwnProperty('traits')) {
    if (payload.traits.hasOwnProperty('data')) {
      payload.traits.data.forEach(function (element) {
        if (element.hasOwnProperty('birthDate')) {
          element.birthDate = moment(element.birthDate).valueOf()
        }
        if (element.hasOwnProperty('timePeriodFrom')) {
          console.log('Time Period From - ' + element.timePeriodFrom)
          if (element.timePeriodFrom) {
            console.log('Time Period Converted - ' + moment(element.timePeriodFrom).valueOf())
            element.timePeriodFrom = moment(element.timePeriodFrom).valueOf()
          } else {
            console.log('Null')
            element.timePeriodFrom = null
          }
        }
        if (element.hasOwnProperty('timePeriodTo')) {
          if (element.timePeriodTo) {
            element.timePeriodTo = moment(element.timePeriodTo).valueOf()
          } else {
            element.timePeriodTo = null
          }
        }
      })
    }
  } else {
    payload.handleSuggest = {
      input: payload.handle,
      output: payload.handle,
      payload: {
        handle: payload.handle,
        userId: payload.userId.toString(),
        id: payload.userId.toString(),
        photoURL: payload.photoURL,
        firstName: payload.firstName,
        lastName: payload.lastName
      }
    }
  }

  return payload
}

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
  // construct ES query for stats
  const esQueryStats = {
    index: config.get('ES.MEMBER_STATS_ES_INDEX'),
    type: config.get('ES.MEMBER_STATS_ES_TYPE'),
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
  const docsStats = await esClient.search(esQueryStats)
  return docsStats
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

function getIndexAndType (type) {
  if (type === 'profile') {
    return {
      index: config.get('ES.MEMBER_PROFILE_ES_INDEX'),
      type: config.get('ES.MEMBER_PROFILE_ES_TYPE')
    }
  } else if (type === 'trait') {
    return {
      index: config.get('ES.MEMBER_TRAIT_ES_INDEX'),
      type: config.get('ES.MEMBER_TRAIT_ES_TYPE')
    }
  } else if (type === 'status') {
    return {
      index: config.get('ES.MEMBER_STATS_ES_INDEX'),
      type: config.get('ES.MEMBER_STATS_ES_TYPE')
    }
  } else if (type === 'skills') {
    return {
      index: config.get('ES.MEMBER_SKILLS_ES_INDEX'),
      type: config.get('ES.MEMBER_SKILLS_ES_TYPE')
    }
  }
}

/**
 * Get elastic search data.
 * @param {String} id the Elastic search data id
 * @returns {Object} Data from Elastic search
 */
async function getESData (id, typeName) {
  const { index, type } = getIndexAndType(typeName)
  const result = await client.getSource({
    index,
    type,
    id
  })
  return result
}

/**
 * Create message in Elasticsearch.
 * @param {String} id the Elasticsearch record id
 * @param {Object} message the message
 */
async function create (id, typeName, payload, transaction) {
  const { index, type } = getIndexAndType(typeName)
  const result = await client.create({
    index,
    type,
    id,
    body: convertPayload(payload)
  })
  if (transaction) {
    transaction.create.es.push({ id, typeName, payload })
  }
  return result
}

function getPayloadFromDb (dbItem, data) {
  let newItem = {}
  const copyedItem = _.cloneDeep(dbItem)
  Object.keys(dbItem).forEach((key) => {
    newItem[key] = copyedItem[key]
  })
  Object.keys(data).forEach((key) => {
    newItem[key] = data[key]
  })
  if (newItem.hasOwnProperty('addresses') && typeof (newItem.addresses) === 'string') {
    newItem.addresses = JSON.parse(newItem.addresses)
  }
  if (newItem.hasOwnProperty('traits') && typeof (newItem.traits) === 'string') {
    newItem.traits = JSON.parse(newItem.traits)
  }
  if (newItem.hasOwnProperty('skills') && typeof (newItem.skills) === 'string') {
    newItem.skills = JSON.parse(newItem.skills)
  }
  return newItem
}

async function update (id, typeName, payload, transaction) {
  const { index, type } = getIndexAndType(typeName)
  convertPayload(payload)
  let origin
  let shouldCreate = false
  try {
    origin = await getESData(id, typeName)
  } catch (e) {
    shouldCreate = true
  }
  const result = await client.update({
    index,
    type,
    id,
    body: { upsert: payload, doc: payload }
  })
  if (transaction) {
    if (shouldCreate) {
      transaction.create.es.push({ id, typeName, payload: payload })
    } else {
      transaction.update.es.push({ id, typeName, payload: origin })
    }
  }
  return result
}

/**
 * remove elastic data
 * @param {*} payload
 * @param {*} transaction
 * @returns
 */
async function remove (id, typeName, transaction) {
  const { index, type } = getIndexAndType(typeName)
  const origin = await getESData(id, typeName)
  const result = await client.delete({
    index,
    type,
    id
  })

  if (transaction) {
    transaction.delete.es.push({ id, typeName, payload: origin })
  }
  return result
}

module.exports = {
  getMembers,
  getMembersSkills,
  getMembersStats,
  getSuggestion,
  getTotal,
  getIndexAndType,

  getESData,
  create,
  getPayloadFromDb,
  update,
  remove
}
