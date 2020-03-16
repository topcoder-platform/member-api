/*
 * E2E tests of statistics API
 */

require('../../app-bootstrap')
const _ = require('lodash')
const config = require('config')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')
const testHelper = require('../testHelper')

const should = chai.should()
chai.use(chaiHttp)

const basePath = `/${config.API_VERSION}/members`

describe('statistics API E2E tests', () => {
  // test data
  let member1
  let distribution1
  let distribution2
  let historyStats
  let memberStats
  let memberSkills

  before(async () => {
    await testHelper.createData()
    const data = testHelper.getData()
    member1 = data.member1
    distribution1 = data.distribution1
    distribution2 = data.distribution2
    historyStats = data.historyStats
    memberStats = data.memberStats
    memberSkills = data.memberSkills
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('get distribution statistics API tests', () => {
    it('get distribution statistics successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/stats/distribution`)
        .query({
          track: distribution1.track,
          subTrack: distribution1.subTrack,
          fields: 'track,subTrack,distribution,createdBy,updatedBy'
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(_.isEqual(result, _.omit(distribution1, ['createdAt', 'updatedAt'])), true)
    })

    it('get distribution statistics successfully 2', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/stats/distribution`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.distribution.ratingRange0To099,
        distribution1.distribution.ratingRange0To099 + distribution2.distribution.ratingRange0To099)
      should.equal(result.distribution.ratingRange100To199,
        distribution1.distribution.ratingRange100To199 + distribution2.distribution.ratingRange100To199)
      should.exist(result.createdAt)
      should.exist(result.createdBy)
      should.exist(result.updatedAt)
      should.exist(result.updatedBy)
    })

    it('get distribution statistics - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/stats/distribution`)
        .query({ track: 'develop', subTrack: 'other' })
      should.equal(response.status, 404)
      should.equal(response.body.message, 'No member distribution statistics is found.')
    })

    it('get distribution statistics - invalid field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/stats/distribution`)
        .query({ fields: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('get distribution statistics - duplicate fields', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/stats/distribution`)
        .query({ fields: 'track,track' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: track')
    })

    it('get distribution statistics - empty field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/stats/distribution`)
        .query({ fields: 'track, ,subTrack' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Empty value.')
    })

    it('get distribution statistics - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/stats/distribution`)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get member history statistics API tests', () => {
    it('get member history statistics successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats/history`)
        .query({
          fields: 'userId,handle,handleLower,createdBy,updatedBy'
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(_.isEqual(result, _.pick(historyStats,
        ['userId', 'handle', 'handleLower', 'createdBy', 'updatedBy'])), true)
      should.not.exist(result.createdAt)
      should.not.exist(result.updatedAt)
      should.not.exist(result.DEVELOP)
      should.not.exist(result.DATA_SCIENCE)
    })

    it('get member history statistics - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/other/stats/history`)
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('get member history statistics - invalid field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats/history`)
        .query({ fields: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('get member history statistics - duplicate fields', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats/history`)
        .query({ fields: 'userId,createdAt,userId' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: userId')
    })

    it('get member history statistics - empty field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats/history`)
        .query({ fields: 'userId, ,createdAt' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Empty value.')
    })

    it('get member history statistics - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats/history`)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get member statistics API tests', () => {
    it('get member statistics successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats`)
        .query({
          fields: 'userId,handle,handleLower,maxRating,challenges,wins,copilot,createdBy,updatedBy'
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(_.isEqual(result, _.pick(memberStats,
        ['userId', 'handle', 'handleLower', 'maxRating', 'challenges',
          'wins', 'copilot', 'createdBy', 'updatedBy'])), true)
      should.not.exist(result.createdAt)
      should.not.exist(result.updatedAt)
      should.not.exist(result.develop)
      should.not.exist(result.design)
      should.not.exist(result.dataScience)
    })

    it('get member statistics - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/other/stats`)
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('get member statistics - invalid field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats`)
        .query({ fields: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('get member statistics - duplicate fields', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats`)
        .query({ fields: 'userId,createdAt,userId' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: userId')
    })

    it('get member statistics - empty field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats`)
        .query({ fields: 'userId, ,createdAt' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Empty value.')
    })

    it('get member statistics - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/stats`)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get member skills API tests', () => {
    it('get member skills successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/skills`)
        .query({
          fields: 'userId,handle,handleLower,skills,createdBy,updatedBy'
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.userId, memberSkills.userId)
      should.equal(result.handle, memberSkills.handle)
      should.equal(result.handleLower, memberSkills.handleLower)
      should.equal(result.createdBy, memberSkills.createdBy)
      should.equal(result.updatedBy, memberSkills.updatedBy)
      should.not.exist(result.createdAt)
      should.not.exist(result.updatedAt)
      should.exist(result.skills)
      should.exist(result.skills.Java)
      should.not.exist(result.skills.NodeJS)
      should.equal(_.isEqual(result.skills.Java, memberSkills.skills.Java), true)
      should.equal(result.userId, memberSkills.userId)
      should.equal(result.userId, memberSkills.userId)
    })

    it('get member skills - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/other/skills`)
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('get member skills - invalid field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/skills`)
        .query({ fields: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('get member skills - duplicate fields', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/skills`)
        .query({ fields: 'userId,createdAt,userId' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: userId')
    })

    it('get member skills - empty field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/skills`)
        .query({ fields: 'userId, ,createdAt' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Empty value.')
    })

    it('get member skills - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/skills`)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('partially update member skills API tests', () => {
    it('partially update member skills successfully 1', async () => {
      const skills = {
        Java: {
          tagName: 'code',
          hidden: false,
          score: 1888,
          sources: ['source1', 'source2']
        },
        NodeJS: {
          tagName: 'code',
          hidden: false,
          score: 1999,
          sources: ['source3', 'source4']
        }
      }
      const response = await chai.request(app)
        .patch(`${basePath}/${member1.handle}/skills`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(skills)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.userId, memberSkills.userId)
      should.equal(result.handle, memberSkills.handle)
      should.equal(result.handleLower, memberSkills.handleLower)
      should.equal(_.isEqual(result.skills, skills), true)
      should.exist(result.createdAt)
      should.exist(result.updatedAt)
      should.equal(result.createdBy, memberSkills.createdBy)
      should.equal(result.updatedBy, 'TonyJ')
    })

    it('partially update member skills successfully 2', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${member1.handle}/skills`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          DotNet: {
            tagName: 'code',
            hidden: true,
            score: 1777,
            sources: ['source1', 'source3']
          }
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.userId, memberSkills.userId)
      should.equal(result.handle, memberSkills.handle)
      should.equal(result.handleLower, memberSkills.handleLower)
      should.equal(_.isEqual(result.skills, {
        Java: {
          tagName: 'code',
          hidden: false,
          score: 1888,
          sources: ['source1', 'source2']
        },
        NodeJS: {
          tagName: 'code',
          hidden: false,
          score: 1999,
          sources: ['source3', 'source4']
        },
        DotNet: {
          tagName: 'code',
          hidden: true,
          score: 1777,
          sources: ['source1', 'source3']
        }
      }), true)
      should.exist(result.createdAt)
      should.exist(result.updatedAt)
      should.equal(result.createdBy, memberSkills.createdBy)
      should.equal(result.updatedBy, 'TonyJ')
    })

    it('partially update member skills - forbidden', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${member1.handle}/skills`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send({
          DotNet: {
            tagName: 'code',
            hidden: false,
            score: 1777,
            sources: ['source1', 'source3']
          }
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('partially update member skills - not found', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/other/skills`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          DotNet: {
            tagName: 'code',
            hidden: false,
            score: 1777,
            sources: ['source1', 'source3']
          }
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('partially update member skills - invalid request body', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${member1.handle}/skills`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(['abc'])
      should.equal(response.status, 400)
      should.equal(response.body.message, '"data" must be an object')
    })

    it('partially update member skills - missing request body', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${member1.handle}/skills`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"data" must have at least 1 children')
    })

    it('partially update member skills - invalid skills sources', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${member1.handle}/skills`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          DotNet: {
            tagName: 'code',
            hidden: false,
            score: 1777,
            sources: 123
          }
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"sources" must be an array')
    })

    it('partially update member skills - invalid skills score', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${member1.handle}/skills`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          DotNet: {
            tagName: 'code',
            hidden: false,
            score: -1898,
            sources: ['source1', 'source3']
          }
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"score" must be larger than or equal to 0')
    })
  })
})
