/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const esClient = helper.getESClient()

const DISTRIBUTION_FIELDS = ['track', 'subTrack', 'distribution', 'createdAt', 'updatedAt',   'createdBy', 'updatedBy']

const HISTORY_STATS_FIELDS = ['userId', 'handle', 'handleLower', 'DEVELOP', 'DATA_SCIENCE',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy']

const MEMBER_STATS_FIELDS = ['userId', 'groupId', 'handle', 'handleLower', 'maxRating',
  'challenges', 'wins','DEVELOP', 'DESIGN', 'DATA_SCIENCE', 'copilot', 'createdAt',
  'updatedAt', 'createdBy', 'updatedBy']

const MEMBER_SKILL_FIELDS = ['userId', 'handle', 'handleLower', 'skills',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy']

/**
 * Get distribution statistics.
 * @param {Object} query the query parameters
 * @returns {Object} the distribution statistics
 */
async function getDistribution (query) {
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, DISTRIBUTION_FIELDS)

  // find matched distribution records
  let criteria
  if (query.track || query.subTrack) {
    criteria = {}
    query.track = query.track.toUpperCase()
    query.subTrack = query.subTrack.toUpperCase()
    if (query.track) {
      criteria.track = { CONTAINS: query.track }
    }
    if (query.subTrack) {
      criteria.subTrack = { CONTAINS: query.subTrack }
    }
  }
  const records = await helper.scan('MemberDistributionStats', criteria)
  if (!records || records.length === 0) {
    throw new errors.NotFoundError(`No member distribution statistics is found.`)
  }

  // aggregate the statistics
  let result = { track: query.track, subTrack: query.subTrack, distribution: {} }
  _.forEach(records, (record) => {
    if (record.distribution) {
      // sum the statistics
      _.forIn(record.distribution, (value, key) => {
        if (!result.distribution[key]) {
          result.distribution[key] = 0
        }
        result.distribution[key] += Number(value)
      })
      // use earliest createdAt
      if (record.createdAt && (!result.createdAt || new Date(record.createdAt) < result.createdAt)) {
        result.createdAt = new Date(record.createdAt)
        result.createdBy = record.createdBy
      }
      // use latest updatedAt
      if (record.updatedAt && (!result.updatedAt || new Date(record.updatedAt) > result.updatedAt)) {
        result.updatedAt = new Date(record.updatedAt)
        result.updatedBy = record.updatedBy
      }
    }
  })
  // select fields if provided
  if (fields) {
    result = _.pick(result, fields)
  }
  return result
}

getDistribution.schema = {
  query: Joi.object().keys({
    track: Joi.string(),
    subTrack: Joi.string(),
    fields: Joi.string()
  })
}

/**
 * Get history statistics.
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the history statistics
 */
async function getHistoryStats (handle, query) {
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, HISTORY_STATS_FIELDS)
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  // get statistics by member user id
  let stat = await helper.getEntityByHashKey('MemberHistoryStats', 'userId', member.userId)
  // select fields if provided
  if (fields) {
    stat = _.pick(stat, fields)
  }
  if (stat.hasOwnProperty("DEVELOP")) {
    stat.DEVELOP = JSON.parse(stat.DEVELOP)
  }
  if (stat.hasOwnProperty("DATA_SCIENCE")) {
    stat.DATA_SCIENCE = JSON.parse(stat.DATA_SCIENCE)
  }
  return stat
}

getHistoryStats.schema = {
  handle: Joi.string().required(),
  query: Joi.object().keys({
    groupIds: Joi.string(),
    fields: Joi.string()
  })
}

/**
 * Get member statistics.
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the member statistics
 */
async function getMemberStats (handle, query) {
  let overallStat = []
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, MEMBER_STATS_FIELDS)
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  let groupIds = query.groupIds
  if (!groupIds) {
    let stats
    try {
      // get statistics by member user id from Elasticsearch
      stats = await esClient.get({
        index: config.ES.MEMBER_STATS_ES_INDEX,
        type: config.ES.MEMBER_STATS_ES_TYPE,
        id: member.userId + "_10"
      });
      if (stats.hasOwnProperty("_source")) {
        stats = stats._source
      }
    } catch (error) {
      if (error.displayName == "NotFound") {
        // get statistics by member user id from dynamodb
        stats = await helper.getEntityByHashKey('MemberStats', 'userId', member.userId)
        stats.groupId = 10
      }
    }
    overallStat.push(stats)
  }
  if (groupIds) {
    for (const groupId of groupIds.split(',')) {
      let stats
      try {
        // get statistics private by member user id from Elasticsearch
        stats = await esClient.get({
          index: config.ES.MEMBER_STATS_ES_INDEX,
          type: config.ES.MEMBER_STATS_ES_TYPE,
          id: member.userId + "_" + groupId
        });
        if (stats.hasOwnProperty("_source")) {
          stats = stats._source
        }
      } catch (error) {
        if (error.displayName == "NotFound") {
          if(groupId == "10") {
            // get statistics by member user id from dynamodb
            stats = await helper.getEntityByHashKey('MemberStats', 'userId', member.userId)
            stats.groupId = 10
          } else {
            // get statistics private by member user id from dynamodb
            stats = await helper.getEntityByHashRangeKey('MemberStatsPrivate', 'userId', member.userId, 'groupId', groupId)
          }
        }
      }
      overallStat.push(stats)
    }
  }
  // cleanup - convert string to object
  for (count = 0; count < overallStat.length; count++) {
    if (overallStat[count].hasOwnProperty("maxRating")) {
      if (typeof overallStat[count].maxRating == "string") {
      overallStat[count].maxRating = JSON.parse(overallStat[count].maxRating)
      }
    }
    if (overallStat[count].hasOwnProperty("DATA_SCIENCE")) {
      if (typeof overallStat[count].DATA_SCIENCE == "string") {
        overallStat[count].DATA_SCIENCE = JSON.parse(overallStat[count].DATA_SCIENCE)
      }
    }
    if (overallStat[count].hasOwnProperty("DESIGN")) {
      if (typeof overallStat[count].DESIGN == "string") {
        overallStat[count].DESIGN = JSON.parse(overallStat[count].DESIGN)
      }
    }
    if (overallStat[count].hasOwnProperty("DEVELOP")) {
      if (typeof overallStat[count].DEVELOP == "string") {
        overallStat[count].DEVELOP = JSON.parse(overallStat[count].DEVELOP)
      }
    }
    // select fields if provided
    if (fields) {
      overallStat[count] = _.pick(overallStat[count], fields)
    }
  }
  return overallStat
}

getMemberStats.schema = {
  handle: Joi.string().required(),
  query: Joi.object().keys({
    groupIds: Joi.string(),
    fields: Joi.string()
  })
}

/**
 * Get member skills.
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the member skills
 */
async function getMemberSkills (handle, query) {
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, MEMBER_SKILL_FIELDS)

  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  // get skills by member user id
  let skills = await helper.getEntityByHashKey('MemberSkill', 'userId', member.userId)
  // select fields if provided
  if (fields) {
    skills = _.pick(skills, fields)
  }
  // hide hidden skills
  if (skills.skills) {
    const s = {}
    _.forIn(skills.skills, (value, key) => {
      if (!value.hidden) {
        s[key] = value
      }
    })
    skills.skills = s
  }
  return skills
}

getMemberSkills.schema = {
  handle: Joi.string().required(),
  query: Joi.object().keys({
    fields: Joi.string()
  })
}

/**
 * Partially update member skills.
 * @param {Object} currentUser the user who performs operation
 * @param {String} handle the member handle
 * @param {Object} data the skills data to update
 * @returns {Object} the updated member skills
 */
async function partiallyUpdateMemberSkills (currentUser, handle, data) {
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  // get skills by member user id
  const record = await helper.getEntityByHashKey('MemberSkill', 'userId', member.userId)
  if (!record.skills) {
    record.skills = {}
  }
  _.assignIn(record.skills, data)
  record.updatedAt = new Date()
  record.updatedBy = currentUser.handle || currentUser.sub
  const result = await helper.update(record, {})
  return result
}

partiallyUpdateMemberSkills.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  data: Joi.object().min(1).pattern(/.*/, Joi.object().keys({
    tagName: Joi.string(),
    hidden: Joi.boolean(),
    score: Joi.number().min(0),
    sources: Joi.array().items(Joi.string())
  }).required()).required()
}

module.exports = {
  getDistribution,
  getHistoryStats,
  getMemberStats,
  getMemberSkills,
  partiallyUpdateMemberSkills
}

logger.buildService(module.exports)
