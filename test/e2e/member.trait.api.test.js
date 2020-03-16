/*
 * E2E tests of member traits API
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

describe('member traits API E2E tests', () => {
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

  describe('get member traits API tests', () => {
    it('get member traits successfully 1', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ traitIds: 'basic_id,work', fields: 'traitId,categoryName,traits' })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].traitId, 'basic_id')
      should.equal(result[0].categoryName, 'Subscription')
      should.equal(result[0].traits.data.length, 1)
      should.equal(result[0].traits.data[0].test, 'abc')
      should.not.exist(result[0].createdAt)
      should.not.exist(result[0].updatedAt)
      should.not.exist(result[0].createdBy)
      should.not.exist(result[0].updatedBy)
    })

    it('get member traits successfully 2', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].traitId, 'basic_id')
      should.equal(result[0].categoryName, 'Subscription')
      should.equal(result[0].traits.data.length, 1)
      should.equal(result[0].traits.data[0].test, 'abc')
      should.exist(result[0].createdAt)
      should.exist(result[0].updatedAt)
      should.exist(result[0].createdBy)
      should.exist(result[0].updatedBy)
    })

    it('get member traits - missing auth token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('get member traits - invalid bearer format', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', 'invalid format')
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('get member traits - invalid token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('get member traits - expired token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('get member traits - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('get member traits - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/other/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('get member traits - invalid trait id', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ traitIds: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('get member traits - duplicate fields', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ fields: 'traitId,traitId' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: traitId')
    })

    it('get member traits - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('create member traits API tests', () => {
    it('create member traits successfully', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].traitId, 'skill')
      should.equal(result[0].categoryName, 'category')
      should.equal(result[0].traits.data.length, 1)
      should.equal(result[0].traits.data[0].test, 111)
      should.exist(result[0].createdAt)
      should.equal(result[0].createdBy, 'TonyJ')
      should.not.exist(result[0].updatedAt)
      should.not.exist(result[0].updatedBy)
    })

    it('create member traits - conflict', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 400)
      should.equal(response.body.message, 'The trait id skill already exists for the member.')
    })

    it('create member traits - forbidden', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member2.handle}/traits`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to create traits of the member.')
    })

    it('create member traits - not found', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/other/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('create member traits - invalid traitId', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'abc',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 400)
      should.equal(response.body.message, '"traitId" must be one of [basic_id, work, skill, education, communities]')
    })

    it('create member traits - invalid traits', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: 123
        }])
      should.equal(response.status, 400)
      should.equal(response.body.message, '"traits" must be an object')
    })

    it('create member traits - unexpected field', async () => {
      const response = await chai.request(app)
        .post(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] },
          other: 'abc'
        }])
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('update member traits API tests', () => {
    it('update member traits successfully', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category2',
          traits: { data: [{ test: 222 }] }
        }])
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].traitId, 'skill')
      should.equal(result[0].categoryName, 'category2')
      should.equal(result[0].traits.data.length, 1)
      should.equal(result[0].traits.data[0].test, 222)
      should.exist(result[0].createdAt)
      should.equal(result[0].createdBy, 'TonyJ')
      should.exist(result[0].updatedAt)
      should.equal(result[0].updatedBy, 'TonyJ')
    })

    it('update member traits - trait not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'education',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 404)
      should.equal(response.body.message, 'The trait id education is not found for the member.')
    })

    it('update member traits - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member2.handle}/traits`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to update traits of the member.')
    })

    it('update member traits - member not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/other/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 404)
      should.equal(response.body.message, 'Member with handle: "other" doesn\'t exist')
    })

    it('update member traits - invalid traitId', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'abc',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      should.equal(response.status, 400)
      should.equal(response.body.message, '"traitId" must be one of [basic_id, work, skill, education, communities]')
    })

    it('update member traits - invalid traits', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: 123
        }])
      should.equal(response.status, 400)
      should.equal(response.body.message, '"traits" must be an object')
    })

    it('update member traits - unexpected field', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send([{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] },
          other: 'abc'
        }])
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('remove member traits API tests', () => {
    it('remove member traits successfully', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .query({ traitIds: 'skill' })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(_.isEmpty(result), true)
    })

    it('remove member traits - forbidden', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({ traitIds: 'skill' })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('remove member traits - trait not found', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ traitIds: 'skill' })
      should.equal(response.status, 404)
      should.equal(response.body.message, 'The trait id skill is not found for the member.')
    })

    it('remove member traits - invalid trait id', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ traitIds: 'invalid' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Invalid value: invalid')
    })

    it('remove member traits - duplicate trait ids', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ traitIds: 'skill,skill' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Duplicate values: skill')
    })

    it('remove member traits - unexpected query parameter', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${member1.handle}/traits`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })
})
