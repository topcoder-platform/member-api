/*
 * E2E tests of member API
 */

require('../../app-bootstrap')
const _ = require('lodash')
const config = require('config')
const fs = require('fs')
const path = require('path')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')
const testHelper = require('../testHelper')

const should = chai.should()
chai.use(chaiHttp)

const basePath = `/${config.API_VERSION}/members`

const photoContent = fs.readFileSync(path.join(__dirname, '../photo.png'))

describe('member API E2E tests', () => {
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

  describe('get member API tests', () => {
    it('get member successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(_.isEqual(result.maxRating, member1.maxRating), true)
      should.equal(result.userId, member1.userId)
      should.equal(result.firstName, member1.firstName)
      should.equal(result.lastName, member1.lastName)
      should.equal(result.description, member1.description)
      should.equal(result.otherLangName, member1.otherLangName)
      should.equal(result.handle, member1.handle)
      should.equal(result.handleLower, member1.handleLower)
      should.equal(result.status, member1.status)
      should.equal(result.email, member1.email)
      should.equal(result.addresses.length, 1)
      should.equal(result.addresses[0].streetAddr1, member1.addresses[0].streetAddr1)
      should.equal(result.addresses[0].streetAddr2, member1.addresses[0].streetAddr2)
      should.equal(result.addresses[0].city, member1.addresses[0].city)
      should.equal(result.addresses[0].zip, member1.addresses[0].zip)
      should.equal(result.addresses[0].stateCode, member1.addresses[0].stateCode)
      should.equal(result.addresses[0].type, member1.addresses[0].type)
      should.equal(testHelper.getDatesDiff(result.addresses[0].createdAt, member1.addresses[0].createdAt), 0)
      should.equal(testHelper.getDatesDiff(result.addresses[0].updatedAt, member1.addresses[0].updatedAt), 0)
      should.equal(result.addresses[0].createdBy, member1.addresses[0].createdBy)
      should.equal(result.addresses[0].updatedBy, member1.addresses[0].updatedBy)
      should.equal(result.homeCountryCode, member1.homeCountryCode)
      should.equal(result.competitionCountryCode, member1.competitionCountryCode)
      should.equal(result.photoURL, member1.photoURL)
      should.equal(_.isEqual(result.tracks, member1.tracks), true)
      should.equal(testHelper.getDatesDiff(result.createdAt, member1.createdAt), 0)
      should.equal(testHelper.getDatesDiff(result.updatedAt, member1.updatedAt), 0)
      should.equal(result.createdBy, member1.createdBy)
      should.equal(result.updatedBy, member1.updatedBy)
    })

    it('get member successfully 2', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}`)
        .query({ fields: 'userId,firstName,lastName,email,addresses' })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.userId, member1.userId)
      should.equal(result.firstName, member1.firstName)
      should.equal(result.lastName, member1.lastName)
      // identifiable fields should not be returned
      should.not.exist(result.email)
      should.not.exist(result.addresses)
    })

    it('get member - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('get member - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/other`)
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('get member - invalid field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}`)
        .query({ fields: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('get member - duplicate field', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}`)
        .query({ fields: 'email,email' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: email')
    })

    it('get member - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}`)
        .query({ fields: 'email', other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('verify email API tests', () => {
    it('verify email - wrong token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ token: 'wrong' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Wrong verification token.')
    })

    it('verify email successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .query({ token: member1.emailVerifyToken })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.emailChangeCompleted, false)
      should.equal(result.verifiedEmail, member1.email)
    })

    it('verify email successfully 2', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .query({ token: member1.newEmailVerifyToken })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.emailChangeCompleted, true)
      should.equal(result.verifiedEmail, member1.newEmail)
    })

    it('verify email - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ token: member1.emailVerifyToken })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('verify email - missing auth token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .query({ token: member1.emailVerifyToken })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('verify email - invalid bearer format', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', 'invalid format')
        .query({ token: member1.emailVerifyToken })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('verify email - invalid token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .query({ token: member1.emailVerifyToken })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('verify email - expired token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .query({ token: member1.emailVerifyToken })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('verify email - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/other/verify`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ token: member1.emailVerifyToken })
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('verify email - missing verify token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"token" is required')
    })

    it('verify email - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/verify`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .query({ token: member1.emailVerifyToken, other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('update member API tests', () => {
    it('update member successfully', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ verifyUrl: 'http://test.com/verify' })
        .send({
          userId: 999,
          firstName: 'fff',
          lastName: 'lll',
          description: 'updated desc',
          email: 'new-email@test.com'
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(_.isEqual(result.maxRating, member2.maxRating), true)
      should.equal(result.userId, 999)
      should.equal(result.firstName, 'fff')
      should.equal(result.lastName, 'lll')
      should.equal(result.description, 'updated desc')
      should.equal(result.otherLangName, member2.otherLangName)
      should.equal(result.handle, member2.handle)
      should.equal(result.handleLower, member2.handleLower)
      should.equal(result.status, member2.status)
      // email is not updated to new email, because it is not verified yet
      should.equal(result.email, member2.email)
      should.equal(result.addresses.length, 1)
      should.equal(result.addresses[0].streetAddr1, member2.addresses[0].streetAddr1)
      should.equal(result.addresses[0].streetAddr2, member2.addresses[0].streetAddr2)
      should.equal(result.addresses[0].city, member2.addresses[0].city)
      should.equal(result.addresses[0].zip, member2.addresses[0].zip)
      should.equal(result.addresses[0].stateCode, member2.addresses[0].stateCode)
      should.equal(result.addresses[0].type, member2.addresses[0].type)
      should.equal(testHelper.getDatesDiff(result.addresses[0].createdAt, member2.addresses[0].createdAt), 0)
      should.equal(testHelper.getDatesDiff(result.addresses[0].updatedAt, member2.addresses[0].updatedAt), 0)
      should.equal(result.addresses[0].createdBy, member2.addresses[0].createdBy)
      should.equal(result.addresses[0].updatedBy, member2.addresses[0].updatedBy)
      should.equal(result.homeCountryCode, member2.homeCountryCode)
      should.equal(result.competitionCountryCode, member2.competitionCountryCode)
      should.equal(result.photoURL, member2.photoURL)
      should.equal(_.isEqual(result.tracks, member2.tracks), true)
      should.equal(testHelper.getDatesDiff(result.createdAt, member2.createdAt), 0)
      should.exist(result.updatedAt)
      should.equal(result.createdBy, member2.createdBy)
      should.equal(result.updatedBy, 'TonyJ')
    })

    it('update member - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .query({ verifyUrl: 'http://test.com/verify' })
        .send({
          userId: 999,
          firstName: 'fff',
          lastName: 'lll',
          description: 'updated desc',
          email: 'new-email@test.com'
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to update the member.')
    })

    it('update member - not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/other`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          userId: 999
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('update member - invalid verifyUrl', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ verifyUrl: 'abc' })
        .send({
          userId: 999,
          firstName: 'fff',
          lastName: 'lll',
          description: 'updated desc',
          email: 'new-email@test.com'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"verifyUrl" must be a valid uri')
    })

    it('update member - invalid userId', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ verifyUrl: 'http://test.com/verify' })
        .send({
          userId: 'abc'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"userId" must be a number')
    })

    it('update member - invalid photoURL', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ verifyUrl: 'http://test.com/verify' })
        .send({
          photoURL: 'abc'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"photoURL" must be a valid uri')
    })

    it('update member - invalid email', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ verifyUrl: 'http://test.com/verify' })
        .send({
          userId: 999,
          firstName: 'fff',
          lastName: 'lll',
          description: 'updated desc',
          email: 'invalid'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"email" must be a valid email')
    })

    it('update member - unexpected field', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ verifyUrl: 'http://test.com/verify' })
        .send({
          userId: 999,
          firstName: 'fff',
          lastName: 'lll',
          description: 'updated desc',
          other: 'abc'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('upload photo API tests', () => {
    it('upload photo successfully', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member2.handle}/photo`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .attach('photo', photoContent, 'photo.png')
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.photoURL.startsWith(config.PHOTO_URL_TEMPLATE.replace('<key>', '')), true)
    })

    it('upload photo - forbidden', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member2.handle}/photo`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .attach('photo', photoContent, 'photo.png')
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to upload photo for the member.')
    })

    it('upload photo - not found', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/other/photo`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .attach('photo', photoContent, 'photo.png')
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('upload photo - invalid file field name', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member2.handle}/photo`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .attach('invalid', photoContent, 'photo.png')
      should.equal(response.status, 400)
      should.equal(response.body.message, '"photo" is required')
    })

    it('upload photo - missing file', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member2.handle}/photo`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"files" is required')
    })
  })
})
