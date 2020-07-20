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

const distribution1 = {
  track: 'develop',
  subTrack: 'code',
  distribution: {
    ratingRange0To099: 3,
    ratingRange100To199: 5
  },
  updatedAt: '2020-02-06T07:38:50.088Z',
  createdAt: '2020-02-07T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

const distribution2 = {
  track: 'develop',
  subTrack: 'F2F',
  distribution: {
    ratingRange0To099: 8,
    ratingRange100To199: 9
  },
  updatedAt: '2020-02-08T07:38:50.088Z',
  createdAt: '2020-02-09T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

const historyStats = {
  userId: 123,
  handle: 'denis',
  handleLower: 'denis',
  DEVELOP: {
    subTracks: [
      {
        id: 1111,
        name: 'name',
        history: [
          {
            challengeId: 789789,
            challengeName: 'test',
            ratingDate: '2020-02-15T14:04:22.544Z',
            newRating: 1888
          }
        ]
      }
    ]
  },
  DATA_SCIENCE: {
    SRM: {
      history: [
        {
          challengeId: 754545,
          challengeName: 'test2',
          date: '2020-02-15T14:04:22.544Z',
          rating: 1565,
          placement: 1,
          percentile: 100
        }
      ]
    },
    MARATHON_MATCH: {
      history: [
        {
          challengeId: 121212,
          challengeName: 'test3',
          date: '2020-02-15T14:04:22.544Z',
          rating: 1232,
          placement: 2,
          percentile: 80
        }
      ]
    }
  },
  updatedAt: '2020-02-08T07:38:50.088Z',
  createdAt: '2020-02-09T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

const memberStats = {
  userId: 123,
  handle: 'denis',
  handleLower: 'denis',
  maxRating: {
    rating: 1565,
    track: 'develop',
    subTrack: 'code'
  },
  challenges: 10,
  wins: 8,
  develop: {
    challenges: 3,
    wins: 2,
    subTracks: [
      {
        id: 11111,
        name: 'test1',
        challenges: 20,
        wins: 3,
        rank: {
          rating: 1212,
          activePercentile: 80,
          activeRank: 1,
          activeCountryRank: 2,
          activeSchoolRank: 1,
          overallPercentile: 10,
          overallRank: 2,
          overallCountryRank: 1,
          overallSchoolRank: 1,
          volatility: 60,
          reliability: 80,
          maxRating: 1999,
          minRating: 1200
        },
        submissions: {
          numInquiries: 1,
          submissions: 2,
          submissionRate: 3,
          passedScreening: 1,
          screeningSuccessRate: 2,
          passedReview: 3,
          reviewSuccessRate: 1,
          appeals: 2,
          appealSuccessRate: 3,
          maxScore: 1,
          minScore: 2,
          avgScore: 3,
          avgPlacement: 1,
          winPercent: 2
        },
        mostRecentEventDate: '2020-02-15T14:05:16.275Z',
        mostRecentSubmission: '2020-02-15T14:05:16.275Z'
      }
    ],
    mostRecentEventDate: '2020-02-15T14:05:16.275Z',
    mostRecentSubmission: '2020-02-15T14:05:16.275Z'
  },
  design: {
    challenges: 1,
    wins: 2,
    subTracks: [
      {
        id: 1,
        name: 'test',
        numInquiries: 1,
        challenges: 2,
        wins: 3,
        winPercent: 1,
        avgPlacement: 2,
        submissions: 3,
        submissionRate: 1,
        passedScreening: 2,
        screeningSuccessRate: 3,
        mostRecentEventDate: '2020-02-15T14:05:16.275Z',
        mostRecentSubmission: '2020-02-15T14:05:16.275Z'
      }
    ],
    mostRecentEventDate: '2020-02-15T14:05:16.275Z',
    mostRecentSubmission: '2020-02-15T14:05:16.275Z'
  },
  dataScience: {
    challenges: 10,
    wins: 0,
    srm: {
      challenges: 1,
      wins: 2,
      rank: {
        rating: 3,
        percentile: 0,
        rank: 1,
        countryRank: 2,
        schoolRank: 1,
        volatility: 20,
        maximumRating: 10,
        minimumRating: 20,
        defaultLanguage: 'EN',
        competitions: 1,
        mostRecentEventName: 'test',
        mostRecentEventDate: '2020-02-15T14:05:16.276Z'
      },
      challengeDetails: [
        {
          levelName: 'test',
          challenges: 10,
          failedChallenges: 20
        }
      ],
      division1: [
        {
          levelName: 'level 1',
          problemsSubmitted: 1,
          problemsFailed: 2,
          problemsSysByTest: 0
        }
      ],
      division2: [
        {
          levelName: 'level 2',
          problemsSubmitted: 1,
          problemsFailed: 2,
          problemsSysByTest: 0
        }
      ],
      mostRecentEventName: 'test',
      mostRecentEventDate: '2020-02-15T14:05:16.276Z',
      mostRecentSubmission: '2020-02-15T14:05:16.276Z'
    },
    marathonMatch: {
      challenges: 1,
      wins: 2,
      rank: {
        rating: 1,
        competitions: 2,
        avgRank: 1,
        avgNumSubmissions: 0,
        bestRank: 0,
        topFiveFinishes: 0,
        topTenFinishes: 0,
        rank: 10,
        percentile: 20,
        volatility: 10,
        minimumRating: 20,
        maximumRating: 10,
        countryRank: 20,
        schoolRank: 10,
        defaultLanguage: 'test',
        mostRecentEventName: 'test',
        mostRecentEventDate: '2020-02-15T14:05:16.276Z'
      },
      mostRecentEventName: 'test',
      mostRecentEventDate: '2020-02-15T14:05:16.276Z',
      mostRecentSubmission: '2020-02-15T14:05:16.276Z'
    },
    mostRecentEventName: 'test',
    mostRecentEventDate: '2020-02-15T14:05:16.276Z',
    mostRecentSubmission: '2020-02-15T14:05:16.276Z'
  },
  copilot: {
    contests: 10,
    projects: 20,
    failures: 10,
    reposts: 20,
    activeContests: 10,
    activeProjects: 30,
    fulfillment: 40
  },
  updatedAt: '2020-02-08T07:38:50.088Z',
  createdAt: '2020-02-09T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

const memberFinancial = {
  userId: 123,
  amount: 8989,
  status: 'active',
  updatedAt: '2020-02-08T07:38:50.088Z',
  createdAt: '2020-02-09T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

const memberSkills = {
  userId: 123,
  handle: 'denis',
  handleLower: 'denis',
  skills: {
    Java: {
      tagName: 'code',
      hidden: false,
      score: 1888,
      sources: ['source1', 'source2']
    },
    NodeJS: {
      tagName: 'code',
      hidden: true,
      score: 1555,
      sources: ['source3']
    }
  },
  updatedAt: '2020-02-08T07:38:50.088Z',
  createdAt: '2020-02-09T07:38:50.088Z',
  createdBy: 'test1',
  updatedBy: 'test2'
}

let member1DBObj
let member2DBObj
let distribution1DBObj
let distribution2DBObj
let historyStatsDBObj
let memberStatsDBObj
let memberFinancialDBObj
let memberSkillsDBObj

/**
 * Create test data
 */
async function createData () {
  // create data in DB
  member1DBObj = await helper.create('Member', member1)
  member2DBObj = await helper.create('Member', member2)
  distribution1DBObj = await helper.create('MemberDistributionStats', distribution1)
  distribution2DBObj = await helper.create('MemberDistributionStats', distribution2)
  historyStatsDBObj = await helper.create('MemberHistoryStats', historyStats)
  memberStatsDBObj = await helper.create('MemberStats', memberStats)
  memberFinancialDBObj = await helper.create('MemberFinancial', memberFinancial)
  memberSkillsDBObj = await helper.create('MemberEnteredSkills', memberSkills)

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
  await distribution1DBObj.delete()
  await distribution2DBObj.delete()
  await historyStatsDBObj.delete()
  await memberStatsDBObj.delete()
  await memberFinancialDBObj.delete()
  await memberSkillsDBObj.delete()

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
  return { member1, member2, distribution1, distribution2, historyStats, memberStats, memberFinancial, memberSkills }
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
