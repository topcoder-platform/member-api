/*
 * Unit tests of search service
 */

require('../../app-bootstrap')
const _ = require('lodash')
const chai = require('chai')
const service = require('../../src/services/SearchService')
const testHelper = require('../testHelper')

const should = chai.should()

describe('search service unit tests', () => {
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

  describe('search members tests', () => {
    it('search members successfully 1', async () => {
      const res = await service.searchMembers({ isMachine: true }, {
        query: 'denis "first name"',
        handle: member1.handle,
        status: member1.status,
        fields: 'userId,maxRating,firstName,lastName,handle,status,skills,stats',
        page: 1,
        perPage: 10
      })
      should.equal(res.total, 1)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
      const result = res.result
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
      const res = await service.searchMembers({ isMachine: false }, {
        handle: member1.handle,
        status: member1.status,
        fields: 'userId,maxRating,firstName,lastName,handle,status',
        page: 1,
        perPage: 10
      })
      should.equal(res.total, 1)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
      const result = res.result
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
      const res = await service.searchMembers({ isMachine: false }, {
        fields: 'userId,handle',
        page: 1,
        perPage: 10
      })
      should.equal(res.total, 2)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
      const result = res.result
      should.equal(result[0].userId, member1.userId)
      should.equal(result[0].handle, member1.handle)
      should.equal(result[1].userId, member2.userId)
      should.equal(result[1].handle, member2.handle)
    })

    it('search members successfully 4', async () => {
      const res = await service.searchMembers({ isMachine: false }, {
        handle: 'abcdefg',
        page: 1,
        perPage: 10
      })
      should.equal(res.total, 0)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
    })

    it('search members successfully 5', async () => {
      const res = await service.searchMembers({ isMachine: false }, {
        query: 'abcdefg -xyz',
        page: 1,
        perPage: 10
      })
      should.equal(res.total, 0)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
    })

    it('search members - invalid field', async () => {
      try {
        await service.searchMembers({ isMachine: true }, { fields: 'invalid' })
      } catch (e) {
        should.equal(e.message, 'Invalid value: invalid')
        return
      }
      throw new Error('should not reach here')
    })

    it('search members - duplicate fields', async () => {
      try {
        await service.searchMembers({ isMachine: true }, { fields: 'createdAt,handle,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Duplicate values: createdAt')
        return
      }
      throw new Error('should not reach here')
    })

    it('search members - empty field', async () => {
      try {
        await service.searchMembers({ isMachine: true }, { fields: 'userId,  ,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Empty value.')
        return
      }
      throw new Error('should not reach here')
    })

    it('search members - empty handle', async () => {
      try {
        await service.searchMembers({ isMachine: true }, { handle: '' })
      } catch (e) {
        should.equal(e.message.indexOf('"handle" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search members - invalid page', async () => {
      try {
        await service.searchMembers({ isMachine: true }, { page: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"page" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search members - invalid perPage', async () => {
      try {
        await service.searchMembers({ isMachine: true }, { perPage: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search members - unexpected query parameter', async () => {
      try {
        await service.searchMembers({ isMachine: true }, { other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
