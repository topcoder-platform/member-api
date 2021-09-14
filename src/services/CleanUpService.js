/**
 * This service provides operations to clean up the environment for running automated tests.
 */

const _ = require('lodash')
const config = require('config')
const models = require('../models')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const Joi = require('joi')

/**
   * Delete the record from database by the given criteria.
   * @param model the model
   * @param keys the keys criteria
   * @returns {Promise<void>}
   */
async function deleteFromDb (model, keys) {
  if (_.isEmpty(keys)) {
    return
  }
  await models[model].batchDelete(keys)
  logger.info({ message: `${model} test data deleted from DB` })
}

/**
   * Delete the record from database by the given criteria.
   * @param model the model
   * @param key the search key criteria
   * @param value the search value criteria
   * @returns {Promise<void>}
   */
async function deleteFromDbByQuery (model, key, value) {
  if (_.isUndefined(value)) {
    return
  }
  const items = await models[model].query(key).eq(value).exec()
  for (const item of items) {
    await item.delete()
  }
  logger.info({ message: `${model} test data deleted from DB` })
}

/**
   * Delete the record from elasticsearch by the given criteria.
   * @param index the index name
   * @param key the search key criteria
   * @param value the search value criteria
   * @param name the entity name
   * @returns {Promise<void>}
   */
async function deleteFromES (index, key, value, name) {
  if (_.isEmpty(value)) {
    return
  }
  const esClient = helper.getESClient()
  const result = await esClient.deleteByQuery({
    index: index,
    body: {
      query: {
        terms: { [key]: value }
      }
    }
  })
  logger.info({ message: `${result.deleted}/${result.total} ${name}s deleted from ES` })
}

/**
   * Clear the postman test data. The main function of this class.
   * @param {Object} currentUser the user who perform this operation
   * @returns {Promise<void>}
   */
async function cleanUpTestData (currentUser) {
  if (!helper.hasAdminRole(currentUser)) {
    throw new errors.ForbiddenError('You are not allowed to perform this action!')
  }
  logger.info({ message: 'clear the test data from postman test!' })

  const memberDb = await models.Member.scan('handleLower').beginsWith(config.AUTOMATED_TESTING_NAME_PREFIX.toLowerCase()).attributes(['userId', 'handleLower']).using('handleLower-index').exec()
  const memberIdObjs = _.map(memberDb, member => { return { userId: member.userId } })
  const memberIds = _.map(memberIdObjs, 'userId')
  const memberHandleLowers = _.map(memberDb, 'handleLower')
  await deleteFromDb('Member', memberIdObjs)
  await deleteFromDb('MemberAggregatedSkills', memberIdObjs)
  await deleteFromDb('MemberEnteredSkills', memberIdObjs)
  await deleteFromDb('MemberFinancial', memberIdObjs)
  await deleteFromDb('MemberHistoryStats', memberIdObjs)
  await deleteFromDb('MemberStats', memberIdObjs)

  for (const id of memberIds) {
    await deleteFromDbByQuery('MemberHistoryStatsPrivate', 'userId', id)
    await deleteFromDbByQuery('MemberStatsPrivate', 'userId', id)
    await deleteFromDbByQuery('MemberTrait', 'userId', id)
  }
  const distStatsDb = await models.MemberDistributionStats.scan('track').beginsWith(config.AUTOMATED_TESTING_NAME_PREFIX).exec()
  for (const item of distStatsDb) {
    await item.delete()
  }
  await deleteFromES(config.get('ES.MEMBER_PROFILE_ES_INDEX'), '_id', memberHandleLowers, 'Member')
  await deleteFromES(config.get('ES.MEMBER_TRAIT_ES_INDEX'), 'userId', memberIds, 'Trait')

  logger.info({ message: 'clear the test data from postman test completed!' })
}
cleanUpTestData.schema = Joi.object().keys({
  currentUser: Joi.object().required()
}).required()

module.exports = {
  cleanUpTestData
}
