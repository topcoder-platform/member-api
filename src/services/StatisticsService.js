/**
 * This service provides operations of statistics.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const esClient = helper.getESClient()

const DISTRIBUTION_FIELDS = ['track', 'subTrack', 'distribution', 'createdAt', 'updatedAt',
  'createdBy', 'updatedBy']

const HISTORY_STATS_FIELDS = ['userId', 'groupId', 'handle', 'handleLower', 'DEVELOP', 'DATA_SCIENCE',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy']

const MEMBER_STATS_FIELDS = ['userId', 'groupId', 'handle', 'handleLower', 'maxRating',
  'challenges', 'wins', 'DEVELOP', 'DESIGN', 'DATA_SCIENCE', 'COPILOT', 'createdAt',
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
  const fields = helper.parseCommaSeparatedString(query.fields, DISTRIBUTION_FIELDS) || DISTRIBUTION_FIELDS

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
async function getHistoryStats (currentUser, handle, query) {
  let overallStat = []
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, HISTORY_STATS_FIELDS) || HISTORY_STATS_FIELDS
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  const groupIds = await helper.getAllowedGroupIds(currentUser, member, query.groupIds)

  for (const groupId of groupIds) {
    let statsDb
    if (groupId === config.PUBLIC_GROUP_ID) {
      // get statistics by member user id from dynamodb
      statsDb = await helper.getEntityByHashKey(handle, 'MemberHistoryStats', 'userId', member.userId, false)
      if (!_.isEmpty(statsDb)) {
        statsDb.originalItem().groupId = _.toNumber(groupId)
      }
    } else {
      // get statistics private by member user id from dynamodb
      statsDb = await helper.getEntityByHashRangeKey(handle, 'MemberHistoryStatsPrivate', 'userId', member.userId, 'groupId', groupId, false)
    }
    if (!_.isEmpty(statsDb)) {
      overallStat.push(statsDb.originalItem())
    }
  }

  var result = helper.cleanUpStatistics(overallStat, fields)
  // remove identifiable info fields if user is not admin, not M2M and not member himself
  if (!helper.canManageMember(currentUser, member)) {
    result = _.map(result, (item) => _.omit(item, config.STATISTICS_SECURE_FIELDS))
  }
  return result
}

getHistoryStats.schema = {
  currentUser: Joi.any(),
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
async function getMemberStats (currentUser, handle, query, throwError) {
  let stats = []
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, MEMBER_STATS_FIELDS) || MEMBER_STATS_FIELDS
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  const groupIds = await helper.getAllowedGroupIds(currentUser, member, query.groupIds)

  for (const groupId of groupIds) {
    let stat
    try {
      // get statistics private by member user id from Elasticsearch
      stat = (await esClient.get({
        index: config.ES.MEMBER_STATS_ES_INDEX,
        type: config.ES.MEMBER_STATS_ES_TYPE,
        id: member.userId + '_' + groupId
      })).body
      
      if (stat.hasOwnProperty('_source')) {
        stat = stat._source
      }
    } catch (error) {
      if (error.displayName === 'NotFound') {
        if (groupId === config.PUBLIC_GROUP_ID) {
          // get statistics by member user id from dynamodb
          stat = await helper.getEntityByHashKey(handle, 'MemberStats', 'userId', member.userId, false)
          if (!_.isEmpty(stat)) {
            stat = _.assign(stat.originalItem(), { groupId: _.toNumber(groupId) })
          }
        } else {
          // get statistics private by member user id from dynamodb
          stat = await helper.getEntityByHashRangeKey(handle, 'MemberStatsPrivate', 'userId', member.userId, 'groupId', groupId, false)
        }
      }
    }
    if (!_.isEmpty(stat)) {
      stats.push(stat)
    }
  }
  var result = helper.cleanUpStatistics(stats, fields)
  // remove identifiable info fields if user is not admin, not M2M and not member himself
  if (!helper.canManageMember(currentUser, member)) {
    result = _.map(result, (item) => _.omit(item, config.STATISTICS_SECURE_FIELDS))
  }
  return result
}

getMemberStats.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    groupIds: Joi.string(),
    fields: Joi.string()
  }),
  throwError: Joi.boolean()
}

/**
 * Get member skills.
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the member skills
 */
async function getMemberSkills (currentUser, handle, query, throwError) {
  // validate and parse query parameter
  const fields = helper.parseCommaSeparatedString(query.fields, MEMBER_SKILL_FIELDS) || MEMBER_SKILL_FIELDS
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  // fetch tags data
  if (!this.allTags) {
    this.allTags = await helper.getAllTags(config.TAGS.TAGS_BASE_URL + config.TAGS.TAGS_API_VERSION + config.TAGS.TAGS_FILTER)
  }
  // get member entered skill by member user id
  let memberEnteredSkill = await helper.getEntityByHashKey(handle, 'MemberEnteredSkills', 'userId', member.userId, false)
  // get member aggregated skill by member user id
  let memberAggregatedSkill = await helper.getEntityByHashKey(handle, 'MemberAggregatedSkills', 'userId', member.userId, false)
  // cleanup - convert string to object
  memberEnteredSkill = helper.convertToObjectSkills(memberEnteredSkill)
  memberAggregatedSkill = helper.convertToObjectSkills(memberAggregatedSkill)
  // cleanup
  memberEnteredSkill = helper.cleanupSkills(memberEnteredSkill, member)
  // merge skills
  memberEnteredSkill = helper.mergeSkills(memberEnteredSkill, memberAggregatedSkill, this.allTags)
  // select fields if provided
  if (fields) {
    memberEnteredSkill = _.pick(memberEnteredSkill, fields)
  }
  // remove identifiable info fields if user is not admin, not M2M and not member himself
  if (!helper.canManageMember(currentUser, member)) {
    memberEnteredSkill = _.omit(memberEnteredSkill, config.STATISTICS_SECURE_FIELDS)
  }
  return memberEnteredSkill
}

getMemberSkills.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    fields: Joi.string()
  }),
  throwError: Joi.boolean()
}

async function createMemberSkills (currentUser, handle, data) {
  // get member by handle
  const member = await helper.getMemberByHandle(handle)
  // check authorization
  if (!helper.canManageMember(currentUser, member)) {
    throw new errors.ForbiddenError('You are not allowed to update the member skills.')
  }
  // fetch tags data
  if (!this.allTags) {
    this.allTags = await helper.getAllTags(config.TAGS.TAGS_BASE_URL + config.TAGS.TAGS_API_VERSION + config.TAGS.TAGS_FILTER)
  }
  let memberEnteredSkill = {
    userId: member.userId,
    createdAt: new Date().getTime(),
    createdBy: currentUser.handle || currentUser.sub,
    handleLower: handle,
    userHandle: handle,
    skills: {}
  }

  // merge skills
  memberEnteredSkill = helper.mergeSkills(memberEnteredSkill, {}, this.allTags)
  // cleanup data
  var tempSkill = {}
  _.forIn(data, (value, key) => {
    var tag = helper.findTagById(this.allTags, Number(key))
    if (tag) {
      value.tagName = tag.name
      if (!value.hasOwnProperty('hidden')) {
        value.hidden = false
      }
      if (!value.hasOwnProperty('score')) {
        value.score = 1
      }
      value.sources = [ 'USER_ENTERED' ]
      tempSkill[key] = value
    }
  })
  _.assignIn(memberEnteredSkill.skills, tempSkill)
  await helper.create('MemberEnteredSkills', memberEnteredSkill)

  // publish create skills event
  await helper.postBusEvent(constants.TOPICS.MemberSkillsCreated, memberEnteredSkill)

  // get skills by member handle
  const memberSkill = await this.getMemberSkills(currentUser, handle, {}, true)
  return memberSkill
}

createMemberSkills.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  data: Joi.object().min(1).pattern(/.*/, Joi.object().keys({
    tagName: Joi.string(),
    hidden: Joi.boolean(),
    score: Joi.number().min(0),
    sources: Joi.array().items(Joi.string())
  }).required()).required()
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
  // check authorization
  if (!helper.canManageMember(currentUser, member)) {
    throw new errors.ForbiddenError('You are not allowed to update the member skills.')
  }
  // fetch tags data
  if (!this.allTags) {
    this.allTags = await helper.getAllTags(config.TAGS.TAGS_BASE_URL + config.TAGS.TAGS_API_VERSION + config.TAGS.TAGS_FILTER)
  }
  // get member entered skill by member user id
  let memberEnteredSkill = await helper.getEntityByHashKey(handle, 'MemberEnteredSkills', 'userId', member.userId, true)

  // cleanup - convert string to object
  memberEnteredSkill = helper.convertToObjectSkills(memberEnteredSkill)
  // cleanup
  memberEnteredSkill = helper.cleanupSkills(memberEnteredSkill, member)
  // merge skills
  memberEnteredSkill = helper.mergeSkills(memberEnteredSkill, {}, this.allTags)
  // cleanup data
  var tempSkill = {}
  _.forIn(data, (value, key) => {
    var tag = helper.findTagById(this.allTags, Number(key))
    if (tag) {
      value.tagName = tag.name
      if (!value.hasOwnProperty('hidden')) {
        value.hidden = false
      }
      if (!value.hasOwnProperty('score')) {
        value.score = 1
      }
      value.sources = [ 'USER_ENTERED' ]
      tempSkill[key] = value
    }
  })
  _.assignIn(memberEnteredSkill.skills, tempSkill)
  memberEnteredSkill.updatedAt = new Date().getTime()
  memberEnteredSkill.updatedBy = currentUser.handle || currentUser.sub
  await helper.update(memberEnteredSkill, {})

  // publish update skills event
  await helper.postBusEvent(constants.TOPICS.MemberSkillsUpdated, memberEnteredSkill)

  // get skills by member handle
  const memberSkill = await this.getMemberSkills(currentUser, handle, {}, true)
  return memberSkill
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
  createMemberSkills,
  partiallyUpdateMemberSkills
}

logger.buildService(module.exports)
