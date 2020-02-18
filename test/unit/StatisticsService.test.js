/*
 * Unit tests of statistics service
 */

require('../../app-bootstrap')
const _ = require('lodash')
const chai = require('chai')
const service = require('../../src/services/StatisticsService')
const testHelper = require('../testHelper')

const should = chai.should()

describe('statistics service unit tests', () => {
  // test data
  let member1
  let distribution1
  let distribution2
  let historyStats
  let memberStats

  before(async () => {
    await testHelper.createData()
    const data = testHelper.getData()
    member1 = data.member1
    distribution1 = data.distribution1
    distribution2 = data.distribution2
    historyStats = data.historyStats
    memberStats = data.memberStats
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('get distribution statistics tests', () => {
    it('get distribution statistics successfully 1', async () => {
      const result = await service.getDistribution({
        track: distribution1.track,
        subTrack: distribution1.subTrack,
        fields: 'track,subTrack,distribution,createdBy,updatedBy'
      })
      should.equal(_.isEqual(result, _.omit(distribution1, ['createdAt', 'updatedAt'])), true)
    })

    it('get distribution statistics successfully 2', async () => {
      const result = await service.getDistribution({})
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
      try {
        await service.getDistribution({ track: 'design' })
      } catch (e) {
        should.equal(e.message, 'No member distribution statistics is found.')
        return
      }
      throw new Error('should not reach here')
    })

    it('get distribution statistics - invalid field', async () => {
      try {
        await service.getDistribution({ fields: 'invalid' })
      } catch (e) {
        should.equal(e.message, 'Invalid value: invalid')
        return
      }
      throw new Error('should not reach here')
    })

    it('get distribution statistics - duplicate fields', async () => {
      try {
        await service.getDistribution({ fields: 'track,track' })
      } catch (e) {
        should.equal(e.message, 'Duplicate values: track')
        return
      }
      throw new Error('should not reach here')
    })

    it('get distribution statistics - empty field', async () => {
      try {
        await service.getDistribution({ fields: 'track,  ,subTrack' })
      } catch (e) {
        should.equal(e.message, 'Empty value.')
        return
      }
      throw new Error('should not reach here')
    })

    it('get distribution statistics - unexpected query parameter', async () => {
      try {
        await service.getDistribution({ other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get member history statistics tests', () => {
    it('get member history statistics successfully', async () => {
      const result = await service.getHistoryStats(member1.handle, {
        fields: 'userId,handle,handleLower,createdBy,updatedBy'
      })
      should.equal(_.isEqual(result, _.pick(historyStats,
        ['userId', 'handle', 'handleLower', 'createdBy', 'updatedBy'])), true)
      should.not.exist(result.createdAt)
      should.not.exist(result.updatedAt)
      should.not.exist(result.DEVELOP)
      should.not.exist(result.DATA_SCIENCE)
    })

    it('get member history statistics - not found', async () => {
      try {
        await service.getHistoryStats('other', {})
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member history statistics - invalid field', async () => {
      try {
        await service.getHistoryStats(member1.handle, { fields: 'invalid' })
      } catch (e) {
        should.equal(e.message, 'Invalid value: invalid')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member history statistics - duplicate fields', async () => {
      try {
        await service.getHistoryStats(member1.handle, { fields: 'userId,userId' })
      } catch (e) {
        should.equal(e.message, 'Duplicate values: userId')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member history statistics - empty field', async () => {
      try {
        await service.getHistoryStats(member1.handle, { fields: 'userId,  ,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Empty value.')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member history statistics - empty handle', async () => {
      try {
        await service.getHistoryStats('', {})
      } catch (e) {
        should.equal(e.message.indexOf('"handle" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('get member history statistics - unexpected query parameter', async () => {
      try {
        await service.getHistoryStats(member1.handle, { other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get member statistics tests', () => {
    it('get member statistics successfully', async () => {
      const result = await service.getMemberStats(member1.handle, {
        fields: 'userId,handle,handleLower,maxRating,challenges,wins,copilot,createdBy,updatedBy'
      })
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
      try {
        await service.getMemberStats('other', {})
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member statistics - invalid field', async () => {
      try {
        await service.getMemberStats(member1.handle, { fields: 'invalid' })
      } catch (e) {
        should.equal(e.message, 'Invalid value: invalid')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member statistics - duplicate fields', async () => {
      try {
        await service.getMemberStats(member1.handle, { fields: 'createdAt,createdBy,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Duplicate values: createdAt')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member statistics - empty field', async () => {
      try {
        await service.getMemberStats(member1.handle, { fields: 'userId,  ,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Empty value.')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member statistics - empty handle', async () => {
      try {
        await service.getMemberStats('', {})
      } catch (e) {
        should.equal(e.message.indexOf('"handle" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('get member statistics - unexpected query parameter', async () => {
      try {
        await service.getMemberStats(member1.handle, { other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
