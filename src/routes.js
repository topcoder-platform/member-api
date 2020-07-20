/**
 * Contains all routes
 */

const constants = require('../app-constants')
const { SCOPES: {
  MEMBERS
} } = require('config')

module.exports = {
  '/members/health': {
    get: {
      controller: 'HealthController',
      method: 'checkHealth'
    }
  },
  '/members/:handle': {
    get: {
      controller: 'MemberController',
      method: 'getMember',
      auth: 'jwt',
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
  '/members/:handle/traits': {
    get: {
      controller: 'MemberTraitController',
      method: 'getTraits',
      auth: 'jwt',
      scopes: [MEMBERS.READ, MEMBERS.ALL]
    },
    post: {
      controller: 'MemberTraitController',
      method: 'createTraits',
      auth: 'jwt',
      scopes: [MEMBERS.CREATE, MEMBERS.ALL]
    },
    put: {
      controller: 'MemberTraitController',
      method: 'updateTraits',
      auth: 'jwt',
      scopes: [MEMBERS.UPDATE, MEMBERS.ALL]
    },
    delete: {
      controller: 'MemberTraitController',
      method: 'removeTraits',
      auth: 'jwt',
      scopes: [MEMBERS.DELETE, MEMBERS.ALL]
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
      method: 'getHistoryStats',
      auth: 'jwt',
      scopes: [MEMBERS.READ, MEMBERS.ALL]
    }
  },
  '/members/:handle/stats': {
    get: {
      controller: 'StatisticsController',
      method: 'getMemberStats',
      auth: 'jwt',
      scopes: [MEMBERS.READ, MEMBERS.ALL]
    }
  },
  '/members/:handle/skills': {
    get: {
      controller: 'StatisticsController',
      method: 'getMemberSkills',
      auth: 'jwt',
      scopes: [MEMBERS.READ, MEMBERS.ALL]
    },
    patch: {
      controller: 'StatisticsController',
      method: 'partiallyUpdateMemberSkills',
      auth: 'jwt',
      // access: constants.ADMIN_ROLES,
      scopes: [MEMBERS.UPDATE, MEMBERS.ALL]
    }
  },
  '/members/:handle/financial': {
    get: {
      controller: 'MiscController',
      method: 'getMemberFinancial',
      auth: 'jwt',
      scopes: [MEMBERS.READ, MEMBERS.ALL]
    }
  },
  '/members': {
    get: {
      controller: 'SearchController',
      method: 'searchMembers',
      scopes: [MEMBERS.READ, MEMBERS.ALL]
    }
  }
}
