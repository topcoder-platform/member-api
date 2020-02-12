/**
 * Insert seed data to Elasticsearch and database
 */

require('../../app-bootstrap')
const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')

logger.info('Requesting to insert seed data to ES and DB.')

const esClient = helper.getESClient()

const members = [{
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
}, {
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
}]

async function seedData () {
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i]
    // create member in DB
    await helper.create('Member', member)
    // create member in ES
    await esClient.create({
      index: config.ES.ES_INDEX,
      type: config.ES.ES_TYPE,
      id: member.handleLower,
      body: member,
      refresh: 'true' // refresh ES so that it is visible for read operations instantly
    })
  }
}

seedData()
  .then(() => {
    logger.info('Done!')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
