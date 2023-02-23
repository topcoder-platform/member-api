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
  status: 'ACTIVE',
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
  status: 'ACTIVE',
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

const historyStatsPrivate = {
  userId: 123,
  groupId: 20000001,
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
  DEVELOP: {
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
  DESIGN: {
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
  DATA_SCIENCE: {
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
  COPILOT: {
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

const memberPrivateStats = {
  userId: 123,
  groupId: 20000001,
  handle: 'denis',
  handleLower: 'denis',
  maxRating: {
    rating: 1565,
    track: 'develop',
    subTrack: 'code'
  },
  challenges: 10,
  wins: 8,
  DEVELOP: {
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
  DESIGN: {
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
  DATA_SCIENCE: {
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
  COPILOT: {
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

const memberAggregatedSkills = {
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
  updatedAt: 1621895619502,
  createdAt: 1621895619502,
  createdBy: 'test1',
  updatedBy: 'test2'
}

const memberEnteredSkills = {
  userId: 123,
  userHandle: 'POSTMANE2E-denis',
  handleLower: 'postmane2e-denis',
  skills: {
    286: {
      hidden: false,
      score: 1888,
      sources: ['source1', 'source2']
    },
    380: {
      hidden: true,
      score: 1555,
      sources: ['source3']
    },
    311: {
      hidden: false
    }
  },
  updatedAt: 1621895619502,
  createdAt: 1621895619502,
  createdBy: 'test1',
  updatedBy: 'test2'
}

async function seedData () {
  // create member data in DB and ES
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i]
    // create member in DB
    await helper.create('Member', member)
    // create member in ES
    await esClient.create({
      index: config.ES.MEMBER_PROFILE_ES_INDEX,
      id: member.handleLower,
      body: member,
      refresh: 'true' // refresh ES so that it is visible for read operations instantly
    })
  }
  // create member traits data in ES
  await esClient.create({
    index: config.ES.MEMBER_TRAIT_ES_INDEX,
    id: '123_basic_id',
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
  // create DB data
  await helper.create('MemberDistributionStats', distribution1)
  await helper.create('MemberDistributionStats', distribution2)
  await helper.create('MemberHistoryStats', historyStats)
  await helper.create('MemberHistoryStatsPrivate', historyStatsPrivate)
  await helper.create('MemberStats', memberStats)
  await helper.create('MemberStatsPrivate', memberPrivateStats)
  await helper.create('MemberFinancial', memberFinancial)
  await helper.create('MemberAggregatedSkills', memberAggregatedSkills)
  await helper.create('MemberEnteredSkills', memberEnteredSkills)
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
