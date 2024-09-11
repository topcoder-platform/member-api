/**
 * This service provides operations of members.
 */

const _ = require('lodash')
const Joi = require('joi')
const crypto = require('crypto')
const uuid = require('uuid/v4')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const statisticsService = require('./StatisticsService')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const LookerApi = require('../common/LookerApi')
const memberTraitService = require('./MemberTraitService')
// const HttpStatus = require('http-status-codes')

const esClient = helper.getESClient()
const lookerService = new LookerApi(logger)

const MEMBER_FIELDS = ['userId', 'handle', 'handleLower', 'firstName', 'lastName', 'tracks', 'status',
  'addresses', 'description', 'email', 'homeCountryCode', 'competitionCountryCode', 'photoURL', 'verified', 'maxRating',
  'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'loginCount', 'lastLoginDate', 'skills', 'availableForGigs', 
  'skillScoreDeduction', 'namesAndHandleAppearance']

const INTERNAL_MEMBER_FIELDS = ['newEmail', 'emailVerifyToken', 'emailVerifyTokenDate', 'newEmailVerifyToken',
  'newEmailVerifyTokenDate', 'handleSuggest']

/**
 * Clean member fields according to current user.
 * @param {Object} currentUser the user who performs operation
 * @param {Object} member the member profile data
 * @returns {Object} the cleaned member profile data
 */
function cleanMember (currentUser, members, selectFields) {
  var response
  if (Array.isArray(members)) {
    const mb = members[0].originalItem ? members[0].originalItem() : members[0]
    response = omitMemberAttributes(currentUser, mb)
  } else {
    const mb = members.originalItem ? members.originalItem() : members
    response = omitMemberAttributes(currentUser, mb)
  }
  // select fields
  if (selectFields) {
    response = _.pick(response, selectFields)
  }

  if(response.addresses){
    response.addresses.forEach((address) => {
      if(address.stateCode===null){
        address.stateCode=""
      }
      if(address.streetAddr1===null){
        address.streetAddr1=""
      }
      if(address.streetAddr2===null){
        address.streetAddr2=""
      }
      if(address.city===null){
        address.city=""
      }
      if(address.zip===null){
        address.zip=""
      }
    })
  }

  return response
}

function omitMemberAttributes (currentUser, mb) {
  // remove some internal fields
  let res = _.omit(mb, INTERNAL_MEMBER_FIELDS)
  // remove identifiable info fields if user is not admin, not M2M and not member himself
  const canManageMember = helper.canManageMember(currentUser, mb)
  const hasAutocompleteRole = helper.hasAutocompleteRole(currentUser)

  if (!canManageMember) {
    res = _.omit(res, config.MEMBER_SECURE_FIELDS)
    res = helper.secureMemberAddressData(res)
    res = helper.truncateLastName(res)
  }
  if (!canManageMember && !hasAutocompleteRole) {
    res = _.omit(res, config.COMMUNICATION_SECURE_FIELDS)
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
    index: config.ES.MEMBER_PROFILE_ES_INDEX,
    type: config.ES.MEMBER_PROFILE_ES_TYPE,
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
  // let members = await esClient.search(esQuery)
  let members = config.get("ES.OPENSEARCH") == "false"
  ? await esClient.search(esQuery)
  : (await esClient.search(esQuery)).body;  

  if (members.hits.total === 0) {
    logger.debug(`Member ${handle} not found in ES. Lookup in DynamoDB...`)
    try {
      // Check if the member handle exists in DynamoDB
      members = [ await helper.getMemberByHandle(handle) ]
      // Memember was found in DynamoDB but not ES. Send message to member-processor-es
      // to index the member in ES. It's safe to use the "create" topic since the processor
      // will only create a new item of the item doesn't exist, otherwise it'll perform an update operation.
      helper.postBusEvent(constants.TOPICS.MemberCreated, members[0].originalItem())
    } catch (e) {
      logger.debug(`Member ${handle} not found in DynamoDB.`)
      throw new errors.NotFoundError(`Member with handle: "${handle}" doesn't exist`)
    }
  } else {
    members = _.map(members.hits.hits, '_source')
  }

  // get the 'maxRating' from stats
  if (_.includes(selectFields, 'maxRating')) {
    for (let i = 0; i < members.length; i += 1) {
      const memberStatsFields = { 'fields': 'userId,groupId,handleLower,maxRating' }
      const memberStats = await statisticsService.getMemberStats(currentUser, members[i].handleLower,
        memberStatsFields, false)
      if (memberStats[0]) {
        if (memberStats[0].hasOwnProperty('maxRating')) {
          members[i].maxRating = memberStats[0].maxRating
        } else {
          members[i].maxRating = {}
        }
      }
    }
  }
  
  try{
    for (let i = 0; i < members.length; i += 1) {
      if(await lookerService.isMemberVerified(members[i].userId)){
        members[i].verified = true
      }
      else{
        members[i].verified = false
      }
    }
  } catch (e) {
    console.log("Error when contacting Looker: " + JSON.stringify(e))
  }
  // clean member fields according to current user
  return cleanMember(currentUser, members, selectFields)
}

getMember.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    fields: Joi.string()
  })
}

/**
 * Get member profile completeness data.
 * @param {Object} currentUser the user who performs operation
 * @param {String} handle the member handle
 * @param {Object} query the query parameters (not used currently)
 * @returns {Object} the member profile data
 */
async function getProfileCompleteness (currentUser, handle, query) {
  // Don't pass the query parameter to the trait service - we want *all* traits and member data 
  // to come back for calculation of the completeness
  const memberTraits = await memberTraitService.getTraits(currentUser, handle, {})
  // Avoid getting the member stats, since we don't need them here, and performance is
  // better without them
  const memberFields = {'fields': 'userId,handle,handleLower,photoURL,description,skills,verified,availableForGigs'}
  const member = await getMember(currentUser, handle, memberFields)

  //Used for calculating the percentComplete
  let completeItems = 0

  // Magic number - 6 total items for profile "completeness"
  // TODO: Bump this back up to 7 once verification is implemented
  const totalItems = 6

  response = {}
  response.userId = member.userId
  response.handle = member.handle
  data = {}

  // We use this to hold the items not completed, and then randomly pick one
  // to use when showing the "toast" to prompt the user to complete an item in their profile
  showToast = []
  //Set default values

  // TODO: Turn this back on once we have verification flow implemented elsewhere
  //data.verified = false

  data.skills = false
  data.gigAvailability = false
  data.bio = false
  data.profilePicture = false
  data.workHistory = false
  data.education = false

  if(member.availableForGigs != null){
    completeItems += 1
    data.gigAvailability = true
  }

  _.forEach(memberTraits, (item) => {
    if(item.traitId=="education" && item.traits.data.length > 0 && data.education == false){
      completeItems += 1
      data.education = true
    }

    if(item.traitId=="work" && item.traits.data.length > 0 && data.workHistory==false){
      completeItems += 1
      data.workHistory = true
    }
    
  })
  // Push on the incomplete traits for picking a random toast to show
  if(!data.education){
    showToast.push("education")
  }
  if(!data.workHistory){
    showToast.push("workHistory")
  }
  if(!data.gigAvailability){
    showToast.push("gigAvailability")
  }

  // TODO: Do we use the short bio or the "description" field of the member object?
  if(member.description && data.bio==false) {
    completeItems += 1
    data.bio = true
  }
  else{
    showToast.push("bio")
  }

  // TODO: Turn this back on once verification is implemented
  // if(member.verified){
  //   completeItems += 1
  //   data.verified=true
  // }
  // else{
  //   showToast.push("verified")
  // }

  //Must have at least 3 skills entered
  if(member.skills && member.skills.length >= 3 ){
    completeItems += 1
    data.skills=true
  }
  else{
    showToast.push("skills")
  }

  if(member.photoURL){
    completeItems += 1
    data.profilePicture = true
  }
  else{
    showToast.push("profilePicture")
  }

  // Calculate the percent complete and round to 2 decimal places
  data.percentComplete = Math.round(completeItems / totalItems * 100) / 100
  response.data=data

  // Pick a random, unfinished item to show in the toast after the user logs in
  if(showToast.length > 0 && !query.toast){
    response.showToast = showToast[Math.floor(Math.random() * showToast.length)]
  }
  else if(query.toast){
    response.showToast = query.toast
  }

  return response
}

getProfileCompleteness.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    fields: Joi.string(),
    toast: Joi.string()
  })
}

/**
 * Compute the current user's userId
 * @param {Object} currentUser the user who performs operation
 * @param {Object} query the query parameters (not used currently)
 * @returns {Object} uid_signature: user's hashed userId
 */
async function getMemberUserIdSignature (currentUser, query) {
  const hashingSecret = config.HASHING_KEYS[(query.type || '').toUpperCase()];

  const userid_hash = crypto
      .createHmac('sha256', hashingSecret)
      .update(currentUser.userId)
      .digest('hex');

      return { uid_signature: userid_hash };
}

getMemberUserIdSignature.schema = {
  currentUser: Joi.any(),
  query: Joi.object().keys({
    type: Joi.string().valid('userflow').required()
  }).required()
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
  // validate and parse query parameter
  const selectFields = helper.parseCommaSeparatedString(query.fields, MEMBER_FIELDS) || MEMBER_FIELDS
  // check if email has changed
  const emailChanged = data.email &&
    (!member.email || data.email.trim().toLowerCase() !== member.email.trim().toLowerCase())

  if (emailChanged) {
    // check if the new email exists in elastic
    const esCheckEmail = {
      index: config.ES.MEMBER_PROFILE_ES_INDEX,
      type: config.ES.MEMBER_PROFILE_ES_TYPE,
      body: {
        query: {
          bool: {
            filter: [ {
              match_phrase: { email: data.email }
            } ]
          }
        }
      }
    }
    let checkEmail = await esClient.count(esCheckEmail)
    if (checkEmail.count === 0) {
      data.newEmail = data.email
      delete data.email
      data.emailVerifyToken = uuid()
      data.emailVerifyTokenDate = new Date(new Date().getTime() + Number(config.VERIFY_TOKEN_EXPIRATION) * 60000).toISOString()
      data.newEmailVerifyToken = uuid()
      data.newEmailVerifyTokenDate = new Date(new Date().getTime() + Number(config.VERIFY_TOKEN_EXPIRATION) * 60000).toISOString()
    } else {
      throw new errors.EmailRegisteredError(`Email "${data.email}" is already registered`)
    }
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
        verificationAgreeUrl: (config.EMAIL_VERIFY_AGREE_URL).replace(
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
        verificationAgreeUrl: (config.EMAIL_VERIFY_AGREE_URL).replace(
          '<emailVerifyToken>', data.newEmailVerifyToken),
        verificationDisagreeUrl: config.EMAIL_VERIFY_DISAGREE_URL
      },
      recipients: [data.newEmail]
    })
  }
  // clean member fields according to current user
  return cleanMember(currentUser, result, selectFields)
}

updateMember.schema = {
  currentUser: Joi.any(),
  handle: Joi.string().required(),
  query: Joi.object().keys({
    fields: Joi.string()
  }),
  data: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    description: Joi.string().allow(''),
    otherLangName: Joi.string(),
    status: Joi.string(),
    email: Joi.string().email(),
    addresses: Joi.array().items(Joi.object().keys({
      streetAddr1: Joi.string().allow('').allow(null),
      streetAddr2: Joi.string().allow('').allow(null),
      city: Joi.string().allow('').allow(null),
      zip: Joi.string().allow('').allow(null),
      stateCode: Joi.string().allow('').allow(null),
      type: Joi.string()
    })),
    verified: Joi.bool(),
    homeCountryCode: Joi.string(),
    competitionCountryCode: Joi.string(),
    photoURL: Joi.string().uri().allow('').allow(null),
    tracks: Joi.array().items(Joi.string()),
    availableForGigs: Joi.bool().allow(null),
    namesAndHandleAppearance: Joi.string().allow(null)
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
  var fileName = handle + '-' + new Date().getTime() + fileExt
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
  getProfileCompleteness,
  getMemberUserIdSignature,
  updateMember,
  verifyEmail,
  uploadPhoto
}

logger.buildService(module.exports)
