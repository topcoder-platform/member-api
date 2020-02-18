/**
 * Contains all routes
 */

const { SCOPES: {
  MEMBERS
} } = require('config')

module.exports = {
  '/members/:handle': {
    get: {
      controller: 'MemberController',
      method: 'getMember',
      scopes: [MEMBERS.READ, MEMBERS.ALL]
    },
    put: {
      controller: 'MemberController',
      method: 'updateMember',
      auth: 'jwt',
      scopes: [MEMBERS.UPDATE, MEMBERS.ALL]
    }
  },
  '/members/:handle/verify': {
    get: {
      controller: 'MemberController',
      method: 'verifyEmail',
      auth: 'jwt',
      scopes: [MEMBERS.UPDATE, MEMBERS.ALL]
    }
  },
  '/members/:handle/photo': {
    post: {
      controller: 'MemberController',
      method: 'uploadPhoto',
      auth: 'jwt',
      scopes: [MEMBERS.UPDATE, MEMBERS.ALL]
    }
  },

  '/members/stats/distribution': {
    get: {
      controller: 'StatisticsController',
      method: 'getDistribution'
    }
  },
  '/members/:handle/stats/history': {
    get: {
      controller: 'StatisticsController',
      method: 'getHistoryStats'
    }
  },
  '/members/:handle/stats': {
    get: {
      controller: 'StatisticsController',
      method: 'getMemberStats'
    }
  }
}
