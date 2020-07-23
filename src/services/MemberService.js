/**
 * This service provides operations of members.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const statisticsService = require('./StatisticsService')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const HttpStatus = require('http-status-codes')

const esClient = helper.getESClient()

const MEMBER_FIELDS = ['userId', 'handle', 'handleLower', 'firstName', 'lastName', 'tracks', 'status',
  'addresses', 'description', 'email', 'homeCountryCode', 'competitionCountryCode', 'photoURL', 'maxRating',
  'createdAt', 'createdBy','updatedAt','updatedBy']

const INTERNAL_MEMBER_FIELDS = ['newEmail', 'emailVerifyToken', 'emailVerifyTokenDate', 'newEmailVerifyToken',
  'newEmailVerifyTokenDate', 'handleSuggest']

/**
 * Clean member fields according to current user.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} member the member profile data
 * @returns {Object} the cleaned member profile data
 */
function cleanMember (currentUser, members) {
  if (Array.isArray(members)) {
    return _.map(members, function(member) {
      const mb = member.originalItem ? member.originalItem() : member
      return omitMemberAttributes (currentUser, mb)
    })
  } else {
    const mb = members.originalItem ? members.originalItem() : members
    return omitMemberAttributes (currentUser, mb)
  }
}

function omitMemberAttributes (currentUser, mb) {
  // remove some internal fields
  let res = _.omit(mb, INTERNAL_MEMBER_FIELDS)
  // remove identifiable info fields if user is not admin, not M2M and not member himself
  if (!helper.canManageMember(currentUser, mb)) {
    res = _.omit(res, config.MEMBER_SECURE_FIELDS)
  }
  return res
}

/**
 * Get member profile data.
 * @param {Object} currentUser the user who performs operation
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the member profile data
 */
async function getMember (currentUser, handle, query) {
  // validate and parse query parameter
  const selectFields = helper.parseCommaSeparatedString(query.fields, MEMBER_FIELDS) || MEMBER_FIELDS
  // query member from Elasticsearch
  const esQuery = {
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    size: constants.ES_SEARCH_MAX_SIZE, // use a large size to query all records
    body: {
      query: {
        bool: {
          filter: [{ match_phrase: { handleLower: handle.toLowerCase() } }]
        }
      },
      sort: [{ traitId: { order: 'asc' } }]
    }
  }
  // Search with constructed query
  let members = await esClient.search(esQuery)
  if (members.hits.total === 0) {
    throw new errors.NotFoundError(`Member with handle: "${handle}" doesn't exist`)
  } else {
    members = _.map(members.hits.hits, '_source')
  }
  // get the 'maxRating' from stats
  if (_.includes(selectFields, 'maxRating')) {
    for (let i = 0; i < members.length; i += 1) {
      const memberStats = await statisticsService.getMemberStats(currentUser, members[i].handleLower, 
        { "fields": "userId,groupId,handleLower,maxRating" }, false)
      if(memberStats) {
        members[i].maxRating = memberStats[0].maxRating
      }
    }
  }
  // clean member fields according to current user
  members = cleanMember(currentUser, members)
  // select fields
  if (selectFields) {
    if (Array.isArray(members)) {
      return _.map(members, function(member) {
        member = _.pick(member, selectFields)
        return member
      })
    }
  }
  return members
}

getMember.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    fields: Joi.string()
  })
}

/**
 * Update member profile data, only passed fields will be updated.
 * @param {Object} currentUser the user who performs operation
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @param {Object} data the member data to be updated
 * @returns {Object} the updated member data
 */
async function updateMember (currentUser, handle, query, data) {
  const member = await helper.getMemberByHandle(handle)
  // check authorization
  if (!helper.canManageMember(currentUser, member)) {
    throw new errors.ForbiddenError('You are not allowed to update the member.')
  }
  // check if email has changed
  const emailChanged = data.email &&
    (!member.email || data.email.trim().toLowerCase() !== member.email.trim().toLowerCase())

  if (emailChanged) {
    data.newEmail = data.email
    delete data.email
    data.emailVerifyToken = uuid()
    data.emailVerifyTokenDate = new Date(new Date().getTime() + Number(config.VERIFY_TOKEN_EXPIRATION) * 60000).toISOString()
    data.newEmailVerifyToken = uuid()
    data.newEmailVerifyTokenDate = new Date(new Date().getTime() + Number(config.VERIFY_TOKEN_EXPIRATION) * 60000).toISOString()
  }
  // update member in db
  member.updatedAt = new Date().getTime()
  member.updatedBy = currentUser.userId || currentUser.sub
  const result = await helper.update(member, data)
  // update member in es, informix via bus event
  await helper.postBusEvent(constants.TOPICS.MemberUpdated, result.originalItem())
  if (emailChanged) {
    // send email verification to old email
    await helper.postBusEvent(constants.TOPICS.EmailChanged, {
      data: {
        subject: 'Topcoder - Email Change Verification',
        userHandle: member.handle,
        verificationAgreeUrl: (query.verifyUrl || config.EMAIL_VERIFY_AGREE_URL).replace(
          '<emailVerifyToken>', data.emailVerifyToken),
        verificationDisagreeUrl: config.EMAIL_VERIFY_DISAGREE_URL
      },
      recipients: [member.email]
    })
    // send email verification to new email
    await helper.postBusEvent(constants.TOPICS.EmailChanged, {
      data: {
        subject: 'Topcoder - Email Change Verification',
        userHandle: member.handle,
        verificationAgreeUrl: (query.verifyUrl || config.EMAIL_VERIFY_AGREE_URL).replace(
          '<emailVerifyToken>', data.newEmailVerifyToken),
        verificationDisagreeUrl: config.EMAIL_VERIFY_DISAGREE_URL
      },
      recipients: [data.newEmail]
    })
  }
  // clean member fields according to current user
  return cleanMember(currentUser, result)
}

updateMember.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    verifyUrl: Joi.string().uri()
  }),
  data: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    description: Joi.string(),
    otherLangName: Joi.string(),
    status: Joi.string(),
    email: Joi.string().email(),
    addresses: Joi.array().items(Joi.object().keys({
      streetAddr1: Joi.string(),
      streetAddr2: Joi.string(),
      city: Joi.string(),
      zip: Joi.string(),
      stateCode: Joi.string(),
      type: Joi.string(),
      createdAt: Joi.date(),
      updatedAt: Joi.date(),
      createdBy: Joi.string(),
      updatedBy: Joi.string()
    })),
    homeCountryCode: Joi.string(),
    competitionCountryCode: Joi.string(),
    photoURL: Joi.string().uri(),
    tracks: Joi.array().items(Joi.string())
  }).required()
}

/**
 * Verify email.
 * @param {Object} currentUser the user who performs operation
 * @param {String} handle the member handle
 * @param {Object} query the query parameters
 * @returns {Object} the verification result
 */
async function verifyEmail (currentUser, handle, query) {
  const member = await helper.getMemberByHandle(handle)
  if (!helper.canManageMember(currentUser, member)) {
    throw new errors.ForbiddenError('You are not allowed to update the member.')
  }
  let verifiedEmail
  if (member.emailVerifyToken === query.token) {
    if (new Date(member.emailVerifyTokenDate) < new Date()) {
      throw new errors.BadRequestError('Verification token expired.')
    }
    member.emailVerifyToken = 'VERIFIED'
    member.emailVerifyTokenDate = new Date(0).toISOString()
    verifiedEmail = member.email
  } else if (member.newEmailVerifyToken === query.token) {
    if (new Date(member.newEmailVerifyTokenDate) < new Date()) {
      throw new errors.BadRequestError('Verification token expired.')
    }
    member.newEmailVerifyToken = 'VERIFIED'
    member.newEmailVerifyTokenDate = new Date(0).toISOString()
    verifiedEmail = member.newEmail
  } else {
    throw new errors.BadRequestError('Wrong verification token.')
  }
  const emailChangeCompleted = (member.emailVerifyToken === 'VERIFIED' && member.newEmailVerifyToken === 'VERIFIED')
  if (emailChangeCompleted) {
    // emails are verified successfully, move new email to main email
    member.email = member.newEmail
    member.emailVerifyToken = null
    member.emailVerifyTokenDate = new Date(0).toISOString()
    member.newEmail = null
    member.newEmailVerifyToken = null
    member.newEmailVerifyTokenDate = new Date(0).toISOString()
  }
  member.updatedAt = new Date().getTime()
  member.updatedBy = currentUser.userId || currentUser.sub
  // update member in db
  const result = await helper.update(member, {})
  // update member in es, informix via bus event
  await helper.postBusEvent(constants.TOPICS.MemberUpdated, result)
  return { emailChangeCompleted, verifiedEmail }
}

verifyEmail.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    token: Joi.string().required()
  }).required()
}

/**
 * Upload photo.
 * @param {Object} currentUser the user who performs operation
 * @param {String} handle the member handle
 * @param {Object} files the uploaded files
 * @returns {Object} the upload result
 */
async function uploadPhoto (currentUser, handle, files) {
  const member = await helper.getMemberByHandle(handle)
  // check authorization
  if (!helper.canManageMember(currentUser, member)) {
    throw new errors.ForbiddenError('You are not allowed to upload photo for the member.')
  }
  const file = files.photo
  if (file.truncated) {
    throw new errors.BadRequestError(`The photo is too large, it should not exceed ${
      (config.FILE_UPLOAD_SIZE_LIMIT / 1024 / 1024).toFixed(2)
    } MB.`)
  }
  var fileExt = file.name.substr(file.name.lastIndexOf('.'))
  var fileName = handle + "-" + new Date().getTime() + fileExt
  // upload photo to S3
  // const photoURL = await helper.uploadPhotoToS3(file.data, file.mimetype, file.name)
  const photoURL = await helper.uploadPhotoToS3(file.data, file.mimetype, fileName)
  // update member's photoURL
  member.photoURL = photoURL
  member.updatedAt = new Date().getTime()
  member.updatedBy = currentUser.userId || currentUser.sub
  const result = await helper.update(member, {})
  // post bus event
  await helper.postBusEvent(constants.TOPICS.MemberUpdated, result.originalItem())
  return { photoURL }
}

uploadPhoto.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  files: Joi.object().keys({
    photo: Joi.object().required()
  }).required()
}

module.exports = {
  getMember,
  updateMember,
  verifyEmail,
  uploadPhoto
}

logger.buildService(module.exports)
