/*
 * E2E tests of misc API
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

describe('misc API E2E tests', () => {
  // test data
  let member1
  let member2
  let memberFinancial

  before(async () => {
    await testHelper.createData()
    const data = testHelper.getData()
    member1 = data.member1
    member2 = data.member2
    memberFinancial = data.memberFinancial
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('get member financial data API tests', () => {
    it('get member financial data successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({
          fields: 'userId,amount,status,createdBy,updatedBy'
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(_.isEqual(result, _.pick(memberFinancial,
        ['userId', 'amount', 'status', 'createdBy', 'updatedBy'])), true)
      should.not.exist(result.createdAt)
      should.not.exist(result.updatedAt)
    })

    it('get member financial data - forbidden 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('get member financial data - forbidden 2', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member2.handle}/financial`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to get financial data of the user.')
    })

    it('get member financial data - missing auth token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('get member financial data - invalid bearer format', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', 'invalid format')
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('get member financial data - invalid token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('get member financial data - expired token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('get member financial data - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/other/financial`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('get member financial data - invalid field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ fields: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('get member financial data - duplicate fields', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ fields: 'userId,amount,userId' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: userId')
    })

    it('get member financial data - empty field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ fields: 'userId, ,createdAt' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Empty value.')
    })

    it('get member financial data - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/financial`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })
})
