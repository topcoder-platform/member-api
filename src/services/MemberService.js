/**
 * This service provides operations of members.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const HttpStatus = require('http-status-codes')

const esClient = helper.getESClient()

/**
 * Check whether the current user can manage the member data
 * @param {Object} currentUser the user who performs operation
 * @param {Object} member the member profile data
 * @returns {Boolean} whether the current user can manage the member data
 */
function canManageMember (currentUser, member) {
  // only admin, M2M or member himself can manage the member data
  return currentUser && (currentUser.isMachine || helper.hasAdminRole(currentUser) ||
    (currentUser.handle && currentUser.handle.toLowerCase() === member.handleLower))
}

/**
 * Clean member fields according to current user.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} member the member profile data
 * @returns {Object} the cleaned member profile data
 */
function cleanMember (currentUser, member) {
  const mb = member.originalItem ? member.originalItem() : member
  // remove some internal fields
  let res = _.omit(mb,
    ['newEmail', 'emailVerifyToken', 'emailVerifyTokenDate', 'newEmailVerifyToken', 'newEmailVerifyTokenDate'])
  // remove identifiable info fields if user is not admin, not M2M and not member himself
  if (!canManageMember(currentUser, mb)) {
    res = _.omit(res, config.ID_FIELDS)
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
  // validate query parameter
  let selectFields
  if (query.fields) {
    selectFields = query.fields.split(',')
    const allowedFields = ['maxRating', 'userId', 'firstName', 'lastName', 'description', 'otherLangName',
      'handle', 'handleLower', 'status', 'email', 'addresses', 'homeCountryCode', 'competitionCountryCode',
      'photoURL', 'tracks', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']
    const mapping = {}
    _.forEach(selectFields, (field) => {
      if (!_.includes(allowedFields, field)) {
        throw new errors.BadRequestError(`Invalid member field: ${field}`)
      }
      if (mapping[field]) {
        throw new errors.BadRequestError(`Duplicate member field: ${field}`)
      }
      mapping[field] = true
    })
  }

  // get member from Elasticsearch
  let member
  try {
    member = await esClient.getSource({
      index: config.get('ES.ES_INDEX'),
      type: config.get('ES.ES_TYPE'),
      id: handle.toLowerCase()
    })
  } catch (e) {
    if (e.statusCode === HttpStatus.NOT_FOUND) {
      throw new errors.NotFoundError(`Member with handle: "${handle}" doesn't exist`)
    } else {
      throw e
    }
  }
  // clean member fields according to current user
  member = cleanMember(currentUser, member)
  // select fields
  if (selectFields) {
    member = _.pick(member, selectFields)
  }
  return member
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
  if (!canManageMember(currentUser, member)) {
    throw new errors.ForbiddenError('You are not allowed to update the member.')
  }
  const emailChanged = data.email &&
    (!member.email || data.email.trim().toLowerCase() !== member.email.trim().toLowerCase())
  if (emailChanged) {
    data.newEmail = data.email
    delete data.email
    data.newEmailVerifyToken = uuid()
    data.newEmailVerifyTokenDate = new Date(new Date().getTime() + Number(config.VERIFY_TOKEN_EXPIRATION) * 60000)
  }

  // update member
  member.updatedAt = new Date()
  member.updatedBy = currentUser.handle || currentUser.sub
  const result = await helper.update(member, data)
  // post bus events
  await helper.postBusEvent(constants.TOPICS.MemberUpdated, result)
  if (emailChanged) {
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
    maxRating: Joi.object().keys({
      rating: Joi.number().integer().min(0),
      track: Joi.string(),
      subTrack: Joi.string()
    }),
    userId: Joi.number().integer().min(0),
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
  let verifiedEmail
  if (member.emailVerifyToken === query.token) {
    if (new Date(member.emailVerifyTokenDate) < new Date()) {
      throw new errors.BadRequestError('Verification token expired.')
    }
    member.emailVerifyToken = 'VERIFIED'
    member.emailVerifyTokenDate = null
    verifiedEmail = member.email
  } else if (member.newEmailVerifyToken === query.token) {
    if (new Date(member.newEmailVerifyTokenDate) < new Date()) {
      throw new errors.BadRequestError('Verification token expired.')
    }
    member.newEmailVerifyToken = 'VERIFIED'
    member.newEmailVerifyTokenDate = null
    verifiedEmail = member.newEmail
  } else {
    throw new errors.BadRequestError('Wrong verification token.')
  }
  const emailChangeCompleted = (member.emailVerifyToken === 'VERIFIED' && member.newEmailVerifyToken === 'VERIFIED')
  if (emailChangeCompleted) {
    // emails are verified successfully, move new email to main email
    member.email = member.newEmail
    member.newEmail = null
    member.newEmailVerifyToken = null
    member.emailVerifyToken = null
  }
  member.updatedAt = new Date()
  member.updatedBy = currentUser.handle || currentUser.sub
  // update member
  const result = await helper.update(member, {})
  // post bus event
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
  if (!canManageMember(currentUser, member)) {
    throw new errors.ForbiddenError('You are not allowed to upload photo for the member.')
  }

  const file = files.photo
  if (file.truncated) {
    throw new errors.BadRequestError(`The photo is too large, it should not exceed ${
      (config.FILE_UPLOAD_SIZE_LIMIT / 1024 / 1024).toFixed(2)
    } MB.`)
  }

  // upload photo to S3
  const photoURL = await helper.uploadPhotoToS3(file.data, file.mimetype, file.name)
  // update member's photoURL
  member.photoURL = photoURL
  member.updatedAt = new Date()
  member.updatedBy = currentUser.handle || currentUser.sub
  const result = await helper.update(member, {})
  // post bus event
  await helper.postBusEvent(constants.TOPICS.MemberUpdated, result)
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
