/*
 * Unit tests of misc service
 */

require('../../app-bootstrap')
const _ = require('lodash')
const chai = require('chai')
const service = require('../../src/services/MiscService')
const testHelper = require('../testHelper')

const should = chai.should()

describe('misc service unit tests', () => {
  // test data
  let member1
  let memberFinancial

  before(async () => {
    await testHelper.createData()
    const data = testHelper.getData()
    member1 = data.member1
    memberFinancial = data.memberFinancial
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('get member financial data tests', () => {
    it('get member financial data successfully', async () => {
      const result = await service.getMemberFinancial({ isMachine: true }, member1.handle, {
        fields: 'userId,amount,status,createdBy,updatedBy'
      })
      should.equal(_.isEqual(result, _.pick(memberFinancial,
        ['userId', 'amount', 'status', 'createdBy', 'updatedBy'])), true)
      should.not.exist(result.createdAt)
      should.not.exist(result.updatedAt)
    })

    it('get member financial data - forbidden', async () => {
      try {
        await service.getMemberFinancial({ isMachine: false }, member1.handle, {})
      } catch (e) {
        should.equal(e.message, 'You are not allowed to get financial data of the user.')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member financial data - not found', async () => {
      try {
        await service.getMemberFinancial({ isMachine: true }, 'other', {})
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member financial data - invalid field', async () => {
      try {
        await service.getMemberFinancial({ isMachine: true }, member1.handle, { fields: 'invalid' })
      } catch (e) {
        should.equal(e.message, 'Invalid value: invalid')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member financial data - duplicate fields', async () => {
      try {
        await service.getMemberFinancial({ isMachine: true }, member1.handle,
          { fields: 'createdAt,createdBy,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Duplicate values: createdAt')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member financial data - empty field', async () => {
      try {
        await service.getMemberFinancial({ isMachine: true }, member1.handle, { fields: 'userId,  ,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Empty value.')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member financial data - empty handle', async () => {
      try {
        await service.getMemberFinancial({ isMachine: true }, '', {})
      } catch (e) {
        should.equal(e.message.indexOf('"handle" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('get member financial data - unexpected query parameter', async () => {
      try {
        await service.getMemberFinancial({ isMachine: true }, member1.handle, { other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
