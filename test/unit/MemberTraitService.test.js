/*
 * Unit tests of member trait service
 */

require('../../app-bootstrap')
const chai = require('chai')
const service = require('../../src/services/MemberTraitService')
const testHelper = require('../testHelper')

const should = chai.should()

describe('member trait service unit tests', () => {
  // test data
  let member1

  before(async () => {
    await testHelper.createData()
    const data = testHelper.getData()
    member1 = data.member1
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('get member traits tests', () => {
    it('get member traits successfully 1', async () => {
      const result = await service.getTraits(member1.handle,
        { traitIds: 'basic_id,work', fields: 'traitId,categoryName,traits' })
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
      const result = await service.getTraits(member1.handle, {})
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

    it('get member traits - not found', async () => {
      try {
        await service.getTraits('other', {})
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member traits - invalid trait id', async () => {
      try {
        await service.getTraits(member1.handle, { traitIds: 'invalid' })
      } catch (e) {
        should.equal(e.message, 'Invalid value: invalid')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member traits - duplicate fields', async () => {
      try {
        await service.getTraits(member1.handle, { fields: 'createdAt,createdAt' })
      } catch (e) {
        should.equal(e.message, 'Duplicate values: createdAt')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member traits - unexpected query parameter', async () => {
      try {
        await service.getTraits(member1.handle, { invalid: 'email' })
      } catch (e) {
        should.equal(e.message.indexOf('"invalid" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('create member traits tests', () => {
    it('create member traits successfully', async () => {
      const result = await service.createTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
        traitId: 'work',
        categoryName: 'category',
        traits: { data: [{ test: 111 }] }
      }])
      should.equal(result.length, 1)
      should.equal(result[0].traitId, 'work')
      should.equal(result[0].categoryName, 'category')
      should.equal(result[0].traits.data.length, 1)
      should.equal(result[0].traits.data[0].test, 111)
      should.exist(result[0].createdAt)
      should.equal(result[0].createdBy, 'sub1')
      should.not.exist(result[0].updatedAt)
      should.not.exist(result[0].updatedBy)
    })

    it('create member traits - conflict', async () => {
      try {
        await service.createTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'work',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      } catch (e) {
        should.equal(e.message, 'The trait id work already exists for the member.')
        return
      }
      throw new Error('should not reach here')
    })

    it('create member traits - not found', async () => {
      try {
        await service.createTraits({ isMachine: true, sub: 'sub1' }, 'other', [{
          traitId: 'work',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('create member traits - invalid traitId', async () => {
      try {
        await service.createTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'invalid',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      } catch (e) {
        should.equal(e.message.indexOf('"traitId" must be one of [basic_id, work, skill, education, communities]') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create member traits - invalid categoryName', async () => {
      try {
        await service.createTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'work',
          categoryName: [123],
          traits: { data: [{ test: 111 }] }
        }])
      } catch (e) {
        should.equal(e.message.indexOf('"categoryName" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create member traits - unexpected field', async () => {
      try {
        await service.createTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'work',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] },
          other: 123
        }])
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('update member traits tests', () => {
    it('update member traits successfully', async () => {
      const result = await service.updateTraits({ isMachine: true, sub: 'sub2' }, member1.handle, [{
        traitId: 'work',
        categoryName: 'category2',
        traits: { data: [{ test: 222 }] }
      }])
      should.equal(result.length, 1)
      should.equal(result[0].traitId, 'work')
      should.equal(result[0].categoryName, 'category2')
      should.equal(result[0].traits.data.length, 1)
      should.equal(result[0].traits.data[0].test, 222)
      should.exist(result[0].createdAt)
      should.equal(result[0].createdBy, 'sub1')
      should.exist(result[0].updatedAt)
      should.equal(result[0].updatedBy, 'sub2')
    })

    it('update member traits - trait not found', async () => {
      try {
        await service.updateTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'skill',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      } catch (e) {
        should.equal(e.message, 'The trait id skill is not found for the member.')
        return
      }
      throw new Error('should not reach here')
    })

    it('update member traits - member not found', async () => {
      try {
        await service.updateTraits({ isMachine: true, sub: 'sub1' }, 'other', [{
          traitId: 'work',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] }
        }])
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('update member traits - invalid traits data', async () => {
      try {
        await service.updateTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'work',
          categoryName: 'category',
          traits: { data: 123 }
        }])
      } catch (e) {
        should.equal(e.message.indexOf('"data" must be an array') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('update member traits - invalid categoryName', async () => {
      try {
        await service.updateTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'work',
          categoryName: [123],
          traits: { data: [{ test: 111 }] }
        }])
      } catch (e) {
        should.equal(e.message.indexOf('"categoryName" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('update member traits - unexpected field', async () => {
      try {
        await service.updateTraits({ isMachine: true, sub: 'sub1' }, member1.handle, [{
          traitId: 'work',
          categoryName: 'category',
          traits: { data: [{ test: 111 }] },
          other: 123
        }])
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('remove member traits tests', () => {
    it('remove member traits successfully', async () => {
      await service.removeTraits({ handle: 'admin', roles: ['admin'] }, member1.handle,
        { traitIds: 'work' })
    })

    it('remove member traits - trait not found', async () => {
      try {
        await service.removeTraits({ handle: 'admin', roles: ['admin'] }, member1.handle,
          { traitIds: 'work' })
      } catch (e) {
        should.equal(e.message, 'The trait id work is not found for the member.')
        return
      }
      throw new Error('should not reach here')
    })

    it('remove member traits - forbidden', async () => {
      try {
        await service.removeTraits({ handle: 'user', roles: ['user'] }, member1.handle,
          { traitIds: 'work' })
      } catch (e) {
        should.equal(e.message, 'You are not allowed to remove traits of the member.')
        return
      }
      throw new Error('should not reach here')
    })

    it('remove member traits - duplicate fields', async () => {
      try {
        await service.removeTraits({ handle: 'admin', roles: ['admin'] }, member1.handle,
          { traitIds: 'work,work' })
      } catch (e) {
        should.equal(e.message, 'Duplicate values: work')
        return
      }
      throw new Error('should not reach here')
    })

    it('remove member traits - unexpected query parameter', async () => {
      try {
        await service.removeTraits({ handle: 'admin', roles: ['admin'] }, member1.handle,
          { traitIds: 'work', invalid: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"invalid" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
