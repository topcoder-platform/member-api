/*
 * E2E tests of search API
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

describe('search API E2E tests', () => {
  // test data
  let member1
  let member2

  before(async () => {
    await testHelper.createData()
    const data = testHelper.getData()
    member1 = data.member1
    member2 = data.member2
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('search members API tests', () => {
    it('search members successfully 1', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({
          query: '"first name" | testing | denis',
          handle: member1.handle,
          status: member1.status,
          fields: 'userId,maxRating,firstName,lastName,handle,status,skills,stats',
          page: 1,
          perPage: 10
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '1')
      should.equal(response.headers['x-total-pages'], '1')
      should.exist(response.headers['link'])
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].userId, member1.userId)
      should.equal(_.isEqual(result[0].maxRating, member1.maxRating), true)
      should.equal(result[0].firstName, member1.firstName)
      should.equal(result[0].lastName, member1.lastName)
      should.equal(result[0].handle, member1.handle)
      should.equal(result[0].status, member1.status)
      should.exist(result[0].skills)
      should.equal(result[0].skills.length, 1)
      should.equal(result[0].skills[0].name, 'Java')
      should.equal(result[0].skills[0].score, 1888)
      should.exist(result[0].stats)
      should.not.exist(result[0].description)
      should.not.exist(result[0].competitionCountryCode)
      should.not.exist(result[0].photoURL)
      should.not.exist(result[0].tracks)
      should.not.exist(result[0].createdAt)
    })

    it('search members successfully 2', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({
          query: '"first name" | testing | denis',
          handle: member1.handle,
          status: member1.status,
          fields: 'userId,maxRating,firstName,lastName,handle,status',
          page: 1,
          perPage: 10
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '1')
      should.equal(response.headers['x-total-pages'], '1')
      should.exist(response.headers['link'])
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].userId, member1.userId)
      should.equal(_.isEqual(result[0].maxRating, member1.maxRating), true)
      should.equal(result[0].handle, member1.handle)
      should.equal(result[0].status, member1.status)
      should.not.exist(result[0].skills)
      should.not.exist(result[0].stats)
      should.not.exist(result[0].description)
      should.not.exist(result[0].competitionCountryCode)
      should.not.exist(result[0].photoURL)
      should.not.exist(result[0].tracks)
      should.not.exist(result[0].createdAt)
      should.not.exist(result[0].firstName)
      should.not.exist(result[0].lastName)
    })

    it('search members successfully 3', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({
          fields: 'userId,handle',
          page: 1,
          perPage: 1
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '1')
      should.equal(response.headers['x-total'], '2')
      should.equal(response.headers['x-total-pages'], '2')
      should.equal(response.headers['x-next-page'], '2')
      should.exist(response.headers['link'])
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].userId, member1.userId)
      should.equal(result[0].handle, member1.handle)
    })

    it('search members successfully 4', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({
          fields: 'userId,handle',
          page: 2,
          perPage: 1
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '2')
      should.equal(response.headers['x-per-page'], '1')
      should.equal(response.headers['x-total'], '2')
      should.equal(response.headers['x-total-pages'], '2')
      should.equal(response.headers['x-prev-page'], '1')
      should.exist(response.headers['link'])
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].userId, member2.userId)
      should.equal(result[0].handle, member2.handle)
    })

    it('search members successfully 5', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({
          handle: 'abcdefg',
          page: 1,
          perPage: 10
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '0')
      should.equal(response.headers['x-total-pages'], '0')
      const result = response.body
      should.equal(result.length, 0)
    })

    it('search members successfully 6', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({
          query: 'abcdefg -xyz'
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '20')
      should.equal(response.headers['x-total'], '0')
      should.equal(response.headers['x-total-pages'], '0')
      const result = response.body
      should.equal(result.length, 0)
    })

    it('search members - forbidden', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('search members - invalid field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({ fields: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('search members - duplicate fields', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ fields: 'userId,handle,userId' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: userId')
    })

    it('search members - empty field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ fields: 'userId, ,handle' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Empty value.')
    })

    it('search members - invalid page', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({ page: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"page" must be larger than or equal to 1')
    })

    it('search members - invalid perPage', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({ perPage: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"perPage" must be larger than or equal to 1')
    })

    it('search members - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })
})
