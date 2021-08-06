/**
 * This file defines helper methods
 */
const _ = require('lodash')
const constants = require('../../app-constants')
const models = require('../models')
const errors = require('./errors')
const AWS = require('aws-sdk')
const config = require('config')
const busApi = require('topcoder-bus-api-wrapper')
const elasticsearch = require('elasticsearch')
const uuid = require('uuid/v4')
const querystring = require('querystring')
const request = require('request')

// Color schema for Ratings
const RATING_COLORS = [{
  color: '#9D9FA0' /* Grey */,
  limit: 900
}, {
  color: '#69C329' /* Green */,
  limit: 1200
}, {
  color: '#616BD5' /* Blue */,
  limit: 1500
}, {
  color: '#FCD617' /* Yellow */,
  limit: 2200
}, {
  color: '#EF3A3A' /* Red */,
  limit: Infinity
}]

// Bus API Client
let busApiClient

// Elasticsearch client
let esClient

const awsConfig = {
  s3: config.AMAZON.S3_API_VERSION,
  region: config.AMAZON.AWS_REGION
}
if (config.AMAZON.AWS_ACCESS_KEY_ID && config.AMAZON.AWS_SECRET_ACCESS_KEY) {
  awsConfig.accessKeyId = config.AMAZON.AWS_ACCESS_KEY_ID
  awsConfig.secretAccessKey = config.AMAZON.AWS_SECRET_ACCESS_KEY
}
AWS.config.update(awsConfig)

const s3 = new AWS.S3()

const m2mAuth = require('tc-core-library-js').auth.m2m

const m2m = m2mAuth(
  _.pick(config, [
    'AUTH0_URL',
    'AUTH0_AUDIENCE',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'AUTH0_PROXY_SERVER_URL'
  ])
)

/**
 * Wrap async function to standard express function
 * @param {Function} fn the async function
 * @returns {Function} the wrapped function
 */
function wrapExpress (fn) {
  return function (req, res, next) {
    fn(req, res, next).catch(next)
  }
}

/**
 * Wrap all functions from object
 * @param obj the object (controller exports)
 * @returns {Object|Array} the wrapped object
 */
function autoWrapExpress (obj) {
  if (_.isArray(obj)) {
    return obj.map(autoWrapExpress)
  }
  if (_.isFunction(obj)) {
    if (obj.constructor.name === 'AsyncFunction') {
      return wrapExpress(obj)
    }
    return obj
  }
  _.each(obj, (value, key) => {
    obj[key] = autoWrapExpress(value)
  })
  return obj
}

/**
 * Check if the user has admin role
 * @param {Object} authUser the user
 * @returns {Boolean} whether the user has admin role
 */
function hasAdminRole (authUser) {
  if (!authUser.roles) {
    return false
  }
  for (let i = 0; i < authUser.roles.length; i += 1) {
    for (let j = 0; j < constants.ADMIN_ROLES.length; j += 1) {
      if (authUser.roles[i].toLowerCase() === constants.ADMIN_ROLES[j].toLowerCase()) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if exists.
 *
 * @param {Array} source the array in which to search for the term
 * @param {Array | String} term the term to search
 * @returns {Boolean} whether the term is in the source
 */
function checkIfExists (source, term) {
  let terms

  if (!_.isArray(source)) {
    throw new Error('Source argument should be an array')
  }

  source = source.map(s => s.toLowerCase())

  if (_.isString(term)) {
    terms = term.toLowerCase().split(' ')
  } else if (_.isArray(term)) {
    terms = term.map(t => t.toLowerCase())
  } else {
    throw new Error('Term argument should be either a string or an array')
  }

  for (let i = 0; i < terms.length; i++) {
    if (source.includes(terms[i])) {
      return true
    }
  }

  return false
}

/**
 * Get entity by hash key
 * @param {String} modelName the model name
 * @param {String} hashKeyName the hash key name
 * @param {any} value the hash key value
 * @returns {Promise<Object>} the found entity
 */
async function getEntityByHashKey (handle, modelName, hashKeyName, value, throwError) {
  return new Promise((resolve, reject) => {
    models[modelName].query(hashKeyName).eq(value).exec((err, result) => {
      if (err) {
        return reject(err)
      }
      if (result && result.length > 0) {
        return resolve(result[0])
      } else if (throwError) {
        return reject(new errors.NotFoundError(`Can not find ${modelName} with handle: ${handle}`))
      } else {
        return resolve({})
      }
    })
  })
}

/**
 * Get entity by hash key and rang key
 * @param {String} modelName the model name
 * @param {String} hashKeyName the hash key name
 * @param {any} hashKeyValue the hash key value
 * @param {String} rangeKeyName the range key name
 * @param {any} rangeKeyValue the range key value
 * @returns {Promise<Object>} the found entity
 */
async function getEntityByHashRangeKey (handle, modelName, hashKeyName, hashKeyValue, rangeKeyName, rangeKeyValue, throwError) {
  return new Promise((resolve, reject) => {
    var param = {}
    param[hashKeyName] = hashKeyValue
    param[rangeKeyName] = rangeKeyValue
    models[modelName].get(param,
      function (err, result) {
        if (err) {
          return reject(err)
        }
        if (result) {
          return resolve(result)
        } else if (throwError) {
          return reject(new errors.NotFoundError(`Can not find ${modelName} with handle: ${handle}`))
        } else {
          return resolve({})
        }
      }
    )
  })
}

/**
 * Get member by handle
 * @param {String} handle the member handle
 * @returns {Promise<Object>} the member of given handle
 */
async function getMemberByHandle (handle) {
  return new Promise((resolve, reject) => {
    models.Member.query('handleLower').eq(handle.toLowerCase()).exec((err, result) => {
      if (err) {
        return reject(err)
      }
      if (result && result.length > 0) {
        return resolve(result[0])
      } else {
        return reject(new errors.NotFoundError(`Member with handle: "${handle}" doesn't exist`))
      }
    })
  })
}

/**
 * Create item in database
 * @param {Object} modelName The dynamoose model name
 * @param {Object} data The create data object
 * @returns {Promise<Object>} the created object
 */
async function create (modelName, data) {
  const dbItem = new models[modelName](data)
  _.each(['traits', 'addresses', 'skills', 'DEVELOP', 'DESIGN', 'DATA_SCIENCE'], property => {
    if (dbItem.hasOwnProperty(property)) {
      if (typeof dbItem[property] === 'object') {
        dbItem[property] = JSON.stringify(dbItem[property])
      }
    }
  })
  var result = await itemSave(dbItem)
  _.each(['traits', 'addresses', 'skills', 'DEVELOP', 'DESIGN', 'DATA_SCIENCE'], property => {
    if (result.hasOwnProperty(property)) {
      result[property] = JSON.parse(result[property])
      result.originalItem()[property] = JSON.parse(result.originalItem()[property])
    }
  })
  return result
}

/**
 * Update item in database
 * @param {Object} dbItem The Dynamo database item
 * @param {Object} data The updated data object
 * @returns {Promise<Object>} the updated object
 */
async function update (dbItem, data) {
  Object.keys(data).forEach((key) => {
    dbItem[key] = data[key]
  })
  if (dbItem.hasOwnProperty('addresses')) {
    if (typeof dbItem.addresses === 'object') {
      dbItem.addresses = JSON.stringify(dbItem.addresses)
    }
  }
  if (dbItem.hasOwnProperty('traits')) {
    if (typeof dbItem.traits === 'object') {
      dbItem.traits = JSON.stringify(dbItem.traits)
    }
  }
  if (dbItem.hasOwnProperty('skills')) {
    if (typeof dbItem.skills === 'object') {
      dbItem.skills = JSON.stringify(dbItem.skills)
    }
  }
  var result = await itemSave(dbItem)
  if (result.hasOwnProperty('addresses')) {
    result.addresses = JSON.parse(result.addresses)
    result.originalItem().addresses = JSON.parse(result.originalItem().addresses)
  }
  if (result.hasOwnProperty('traits')) {
    result.traits = JSON.parse(result.traits)
    result.originalItem().traits = JSON.parse(result.originalItem().traits)
  }
  if (result.hasOwnProperty('skills')) {
    result.skills = JSON.parse(result.skills)
    result.originalItem().skills = JSON.parse(result.originalItem().skills)
  }
  return result
}

async function itemSave (dbItem) {
  return new Promise((resolve, reject) => {
    dbItem.save((err) => {
      if (err) {
        return reject(err)
      } else {
        return resolve(dbItem)
      }
    })
  })
}

/**
 * Get data collection by scan parameters
 * @param {Object} modelName The dynamoose model name
 * @param {Object} scanParams The scan parameters object
 * @returns {Promise<Array>} the found objects
 */
async function scan (modelName, scanParams) {
  return new Promise((resolve, reject) => {
    models[modelName].scan(scanParams).exec((err, result) => {
      if (err) {
        return reject(err)
      } else {
        return resolve(result.count === 0 ? [] : result)
      }
    })
  })
}

/**
 * Get data collection by Dynamoose query
 * @param {Object} modelName The dynamoose model name
 * @param {Object} queryParams The query parameters object
 * @returns {Promise<Array>} the found objects
 */
async function query (modelName, queryParams) {
  return new Promise((resolve, reject) => {
    models[modelName].query(queryParams).exec((err, result) => {
      if (err) {
        return reject(err)
      } else {
        return resolve(result || [])
      }
    })
  })
}

/**
 * Upload photo to S3
 * @param {Buffer} data the file data
 * @param {String} mimetype the MIME type
 * @param {String} fileName the original file name
 * @return {Promise<String>} the uploaded photo URL
 */
async function uploadPhotoToS3 (data, mimetype, fileName) {
  const params = {
    Bucket: config.AMAZON.PHOTO_S3_BUCKET,
    Key: fileName,
    Body: data,
    ContentType: mimetype,
    ACL: 'public-read',
    Metadata: {
      fileName
    }
  }
  // Upload to S3
  await s3.upload(params).promise()
  // construct photo URL
  return config.PHOTO_URL_TEMPLATE.replace('<key>', fileName)
}

/**
 * Get Bus API Client
 * @return {Object} Bus API Client Instance
 */
function getBusApiClient () {
  // if there is no bus API client instance, then create a new instance
  if (!busApiClient) {
    busApiClient = busApi(_.pick(config,
      ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME',
        'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'BUSAPI_URL',
        'KAFKA_ERROR_TOPIC', 'AUTH0_PROXY_SERVER_URL']))
  }

  return busApiClient
}

/**
 * Post bus event.
 * @param {String} topic the event topic
 * @param {Object} payload the event payload
 */
async function postBusEvent (topic, payload) {
  const client = getBusApiClient()
  await client.postEvent({
    topic,
    originator: constants.EVENT_ORIGINATOR,
    timestamp: new Date().toISOString(),
    'mime-type': constants.EVENT_MIME_TYPE,
    payload
  })
}

/**
 * Get ES Client
 * @return {Object} Elasticsearch Client Instance
 */
function getESClient () {
  if (esClient) {
    return esClient
  }
  const esHost = config.get('ES.HOST')
  // // AWS ES configuration is different from other providers
  // if (/.*amazonaws.*/.test(esHost)) {
  //   esClient = elasticsearch.Client({
  //     apiVersion: config.get('ES.API_VERSION'),
  //     hosts: esHost,
  //     connectionClass: require('http-aws-es'), // eslint-disable-line global-require
  //     amazonES: {
  //       region: config.get('AMAZON.AWS_REGION'),
  //       credentials: new AWS.EnvironmentCredentials('AWS')
  //     }
  //   })
  // } else {
  //   esClient = new elasticsearch.Client({
  //     apiVersion: config.get('ES.API_VERSION'),
  //     hosts: esHost
  //   })
  // }
  esClient = new elasticsearch.Client({
    apiVersion: config.get('ES.API_VERSION'),
    hosts: esHost
  })
  return esClient
}

/**
 * Parse comma separated string to return array of values.
 * @param {String} s the string to parse
 * @param {Array} allowedValues the allowed values
 * @returns {Array} the parsed values
 */
function parseCommaSeparatedString (s, allowedValues) {
  if (!s) {
    return null
  }
  const values = s.split(',')
  // used to check duplicate values
  const mapping = {}
  _.forEach(values, (value) => {
    if (value.trim().length === 0) {
      throw new errors.BadRequestError('Empty value.')
    }
    if (allowedValues && !_.includes(allowedValues, value)) {
      throw new errors.BadRequestError(`Invalid value: ${value}`)
    }
    if (mapping[value]) {
      throw new errors.BadRequestError(`Duplicate values: ${value}`)
    }
    mapping[value] = true
  })
  return values
}

/**
 * Get link for a given page.
 * @param {Object} req the HTTP request
 * @param {Number} page the page number
 * @returns {String} link for the page
 */
function getPageLink (req, page) {
  const q = _.assignIn({}, req.query, { page })
  return `${req.protocol}://${req.get('Host')}${req.baseUrl}${req.path}?${querystring.stringify(q)}`
}

/**
 * Set HTTP response headers from result.
 * @param {Object} req the HTTP request
 * @param {Object} res the HTTP response
 * @param {Object} result the operation result
 */
function setResHeaders (req, res, result) {
  const totalPages = Math.ceil(result.total / result.perPage)
  if (result.page > 1) {
    res.set('X-Prev-Page', result.page - 1)
  }
  if (result.page < totalPages) {
    res.set('X-Next-Page', result.page + 1)
  }
  res.set('X-Page', result.page)
  res.set('X-Per-Page', result.perPage)
  res.set('X-Total', result.total)
  res.set('X-Total-Pages', totalPages)
  // set Link header
  if (totalPages > 0) {
    let link = `<${getPageLink(req, 1)}>; rel="first", <${getPageLink(req, totalPages)}>; rel="last"`
    if (result.page > 1) {
      link += `, <${getPageLink(req, result.page - 1)}>; rel="prev"`
    }
    if (result.page < totalPages) {
      link += `, <${getPageLink(req, result.page + 1)}>; rel="next"`
    }
    res.set('Link', link)
  }
}

/**
 * Check whether the current user can manage the member data
 * @param {Object} currentUser the user who performs operation
 * @param {Object} member the member profile data
 * @returns {Boolean} whether the current user can manage the member data
 */
function canManageMember (currentUser, member) {
  // only admin, M2M or member himself can manage the member data
  return currentUser && (currentUser.isMachine || hasAdminRole(currentUser) ||
    (currentUser.handle && currentUser.handle.toLowerCase() === member.handleLower.toLowerCase()))
}

function cleanUpStatistics (stats, fields) {
  // cleanup - convert string to object
  for (let count = 0; count < stats.length; count++) {
    if (stats[count].hasOwnProperty('maxRating')) {
      if (typeof stats[count].maxRating === 'string') {
        stats[count].maxRating = JSON.parse(stats[count].maxRating)
      }
      // set the rating color
      stats[count].maxRating.ratingColor = this.getRatingColor(stats[count].maxRating.rating)
    }
    if (stats[count].hasOwnProperty('DATA_SCIENCE')) {
      if (typeof stats[count].DATA_SCIENCE === 'string') {
        stats[count].DATA_SCIENCE = JSON.parse(stats[count].DATA_SCIENCE)
      }
    }
    if (stats[count].hasOwnProperty('DESIGN')) {
      if (typeof stats[count].DESIGN === 'string') {
        stats[count].DESIGN = JSON.parse(stats[count].DESIGN)
      }
    }
    if (stats[count].hasOwnProperty('DEVELOP')) {
      if (typeof stats[count].DEVELOP === 'string') {
        stats[count].DEVELOP = JSON.parse(stats[count].DEVELOP)
      }
    }
    // select fields if provided
    if (fields) {
      stats[count] = _.pick(stats[count], fields)
    }
  }
  return stats
}

function convertToObjectSkills (skill) {
  if (skill.hasOwnProperty('skills')) {
    if (typeof skill.skills === 'string') {
      skill.skills = JSON.parse(skill.skills)
    }
  }
  return skill
}

function cleanupSkills (memberEnteredSkill, member) {
  if (memberEnteredSkill.hasOwnProperty('userHandle')) {
    memberEnteredSkill.handle = memberEnteredSkill.userHandle
  }
  if (!memberEnteredSkill.hasOwnProperty('userId')) {
    memberEnteredSkill.userId = member.userId
  }
  if (!memberEnteredSkill.hasOwnProperty('handle')) {
    memberEnteredSkill.handle = member.handle
  }
  if (!memberEnteredSkill.hasOwnProperty('handleLower')) {
    memberEnteredSkill.handleLower = member.handleLower
  }
  return memberEnteredSkill
}

function mergeSkills (memberEnteredSkill, memberAggregatedSkill, allTags) {
  // process skills in member entered skill
  if (memberEnteredSkill.hasOwnProperty('skills')) {
    let tempSkill = {}
    _.forIn(memberEnteredSkill.skills, (value, key) => {
      if (!value.hidden) {
        var tag = this.findTagById(allTags, Number(key))
        if (tag) {
          value.tagName = tag.name
          if (!value.hasOwnProperty('sources')) {
            value.sources = [ 'USER_ENTERED' ]
          }
          if (!value.hasOwnProperty('score')) {
            value.score = 0
          }
          tempSkill[key] = value
        }
      }
    })
    // process skills in member aggregated skill
    if (memberAggregatedSkill.skills) {
      tempSkill = mergeAggregatedSkill(memberAggregatedSkill, allTags, tempSkill)
    }
    memberEnteredSkill.skills = tempSkill
  } else {
    // process skills in member aggregated skill
    if (memberAggregatedSkill.hasOwnProperty('skills')) {
      let tempSkill = {}
      memberEnteredSkill.skills = mergeAggregatedSkill(memberAggregatedSkill, allTags, tempSkill)
    } else {
      memberEnteredSkill.skills = {}
    }
  }
  return memberEnteredSkill
}

function mergeAggregatedSkill (memberAggregatedSkill, allTags, tempSkill) {
  for (var key in memberAggregatedSkill.skills) {
    var value = memberAggregatedSkill.skills[key]
    if (!value.hidden) {
      var tag = findTagById(allTags, Number(key))
      if (tag) {
        if (value.hasOwnProperty('sources')) {
          if (value.sources.includes('CHALLENGE')) {
            if (tempSkill[key]) {
              value.tagName = tag.name
              if (!value.hasOwnProperty('score')) {
                value.score = tempSkill[key].score
              } else {
                if (value.score <= tempSkill[key].score) {
                  value.score = tempSkill[key].score
                }
              }
              value.sources.push(tempSkill[key].sources[0])
            } else {
              value.tagName = tag.name
              if (!value.hasOwnProperty('score')) {
                value.score = 0
              }
            }
            tempSkill[key] = value
          }
        }
      }
    }
  }
  return tempSkill
}

async function getAllTags (url) {
  return new Promise(function (resolve, reject) {
    request({ url: url },
      function (error, response, body) {
        if (error != null) {
          reject(new errors.NotFoundError(`Tags not found. ` + error))
        }
        var allTags = JSON.parse(body)
        resolve(allTags.result.content)
      }
    )
  })
}

function findTagById (data, id) {
  return _.find(data, { 'id': id })
}

function getRatingColor (rating) {
  let i = 0; const r = Number(rating)
  while (RATING_COLORS[i].limit <= r) i += 1
  return RATING_COLORS[i].color || 'black'
}

function paginate (array, page_size, page_number) {
  return array.slice(page_number * page_size, page_number * page_size + page_size)
}

async function parseGroupIds (groupIds) {
  const idArray = _.split(groupIds, ',')
  const newIdArray = []
  for (const id of idArray) {
    if (_.isInteger(_.toNumber(id))) {
      newIdArray.push(id)
    } else {
      try {
        const { oldId } = await getGroupId(id)
        if (oldId != null && oldId.trim() != '') {
          newIdArray.push(oldId)
        }
      } catch (err) { }
    }
  }
  return newIdArray
}

async function getGroupId (id) {
  const token = await getM2MToken()
  return new Promise(function (resolve, reject) {
    request({ url: `${config.GROUPS_API_URL}/${id}`,
      headers: {
        Authorization: `Bearer ${token}`
      } },
    function (error, response, body) {
      if (response.statusCode === 200) {
        resolve(JSON.parse(body))
      } else {
        reject(error)
      }
    }
    )
  })
}

/*
 * Function to get M2M token
 * @returns {Promise}
 */
const getM2MToken = () => {
  return m2m.getMachineToken(
    config.AUTH0_CLIENT_ID,
    config.AUTH0_CLIENT_SECRET
  )
}

module.exports = {
  wrapExpress,
  autoWrapExpress,
  checkIfExists,
  hasAdminRole,
  getMemberByHandle,
  getEntityByHashKey,
  getEntityByHashRangeKey,
  create,
  update,
  scan,
  query,
  uploadPhotoToS3,
  postBusEvent,
  getESClient,
  parseCommaSeparatedString,
  setResHeaders,
  canManageMember,
  cleanUpStatistics,
  convertToObjectSkills,
  cleanupSkills,
  mergeSkills,
  mergeAggregatedSkill,
  getAllTags,
  findTagById,
  getRatingColor,
  paginate,
  parseGroupIds,
  getGroupId,
  getM2MToken
}
