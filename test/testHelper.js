/**
 * This file defines common helper methods used for tests
 */
const config = require('config')
const helper = require('../src/common/helper')

const esClient = helper.getESClient()

const member1 = {
  maxRating: {
    rating: 1000,
    track: 'dev',
    subTrack: 'code'
  },
  userId: 123,
  firstName: 'first name',
  lastName: 'last name',
  description: 'desc',
  otherLangName: 'en',
  handle: 'denis',
  handleLower: 'denis',
  status: 'active',
  email: 'denis@topcoder.com',
  newEmail: 'denis2@topcoder.com',
  emailVerifyToken: 'abcdefg',
  emailVerifyTokenDate: '2028-02-06T07:38:50.088Z',
  newEmailVerifyToken: 'abc123123',
  newEmailVerifyTokenDate: '2028-02-06T07:38:50.088Z',
  addresses: [
    {
      streetAddr1: 'addr1',
      streetAddr2: 'addr2',
      city: 'NY',
      zip: '123123',
      stateCode: 'A',
      type: 'type',
      updatedAt: '2020-02-06T07:38:50.088Z',
      createdAt: '2020-02-06T07:38:50.088Z',
      createdBy: 'test',
      updatedBy: 'test'
    }
  ],
  homeCountryCode: 'US',
  competitionCountryCode: 'US',
  photoURL: 'http://test.com/abc.png',
  tracks: ['code'],
  updatedAt: '2020-02-06T07:38:50.088Z',
  createdAt: '2020-02-06T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

const member2 = {
  maxRating: {
    rating: 1500,
    track: 'dev',
    subTrack: 'code'
  },
  userId: 456,
  firstName: 'first name 2',
  lastName: 'last name 2',
  description: 'desc 2',
  otherLangName: 'en',
  handle: 'testing',
  handleLower: 'testing',
  status: 'active',
  email: 'testing@topcoder.com',
  newEmail: 'testing2@topcoder.com',
  emailVerifyToken: 'abcdefg',
  emailVerifyTokenDate: '2028-02-06T07:38:50.088Z',
  newEmailVerifyToken: 'abc123123',
  newEmailVerifyTokenDate: '2028-02-06T07:38:50.088Z',
  addresses: [
    {
      streetAddr1: 'addr1',
      streetAddr2: 'addr2',
      city: 'NY',
      zip: '123123',
      stateCode: 'A',
      type: 'type',
      updatedAt: '2020-02-06T07:38:50.088Z',
      createdAt: '2020-02-06T07:38:50.088Z',
      createdBy: 'test',
      updatedBy: 'test'
    }
  ],
  homeCountryCode: 'US',
  competitionCountryCode: 'US',
  photoURL: 'http://test.com/def.png',
  tracks: ['code'],
  updatedAt: '2020-02-06T07:38:50.088Z',
  createdAt: '2020-02-06T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

let member1DBObj
let member2DBObj

/**
 * Create test data
 */
async function createData () {
  // create data in DB
  member1DBObj = await helper.create('Member', member1)
  member2DBObj = await helper.create('Member', member2)

  // create data in ES
  await esClient.create({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: member1.handleLower,
    body: member1,
    refresh: 'true' // refresh ES so that it is visible for read operations instantly
  })
  await esClient.create({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: member2.handleLower,
    body: member2,
    refresh: 'true' // refresh ES so that it is visible for read operations instantly
  })
  await esClient.create({
    index: config.ES.MEMBER_TRAIT_ES_INDEX,
    type: config.ES.MEMBER_TRAIT_ES_TYPE,
    id: '123basic_id',
    body: {
      userId: 123,
      traitId: 'basic_id',
      categoryName: 'Subscription',
      traits: {
        data: [{ test: 'abc' }]
      },
      createdAt: '2020-02-06T07:38:50.088Z',
      updatedAt: '2020-02-07T07:38:50.088Z',
      createdBy: 'test1',
      updatedBy: 'test2'
    },
    refresh: 'true' // refresh ES so that it is visible for read operations instantly
  })
}

/**
 * Clear test data
 */
async function clearData () {
  // remove data in DB
  await member1DBObj.delete()
  await member2DBObj.delete()

  // remove data in ES
  await esClient.delete({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: member1.handleLower,
    refresh: 'true' // refresh ES so that it is effective for read operations instantly
  })
  await esClient.delete({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: member2.handleLower,
    refresh: 'true' // refresh ES so that it is effective for read operations instantly
  })
  await esClient.delete({
    index: config.ES.MEMBER_TRAIT_ES_INDEX,
    type: config.ES.MEMBER_TRAIT_ES_TYPE,
    id: '123basic_id',
    refresh: 'true' // refresh ES so that it is effective for read operations instantly
  })
}

/**
 * Get test data.
 */
function getData () {
  return { member1, member2 }
}

/**
 * Get dates difference in milliseconds
 */
function getDatesDiff (d1, d2) {
  return new Date(d1).getTime() - new Date(d2).getTime()
}

module.exports = {
  createData,
  clearData,
  getData,
  getDatesDiff
}
