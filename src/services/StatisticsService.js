/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')

const DISTRIBUTION_FIELDS = ['track', 'subTrack', 'distribution', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']

const HISTORY_STATS_FIELDS = ['userId', 'handle', 'handleLower', 'DEVELOP', 'DATA_SCIENCE',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy']

const MEMBER_STATS_FIELDS = ['userId', 'handle', 'handleLower', 'maxRating', 'challenges', 'wins',
  'develop', 'design', 'dataScience', 'copilot', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']

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
    if (query.track) {
      criteria.track = { eq: query.track }
    }
    if (query.subTrack) {
      criteria.subTrack = { eq: query.subTrack }
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
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, MEMBER_STATS_FIELDS)

  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  // get statistics by member user id
  let stat = await helper.getEntityByHashKey('MemberStats', 'userId', member.userId)
  // select fields if provided
  if (fields) {
    stat = _.pick(stat, fields)
  }
  return stat
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
