/*
 * Unit tests of member service
 */

require('../../app-bootstrap')
const _ = require('lodash')
const config = require('config')
const chai = require('chai')
const fs = require('fs')
const path = require('path')
const service = require('../../src/services/MemberService')
const testHelper = require('../testHelper')

const should = chai.should()

const photoContent = fs.readFileSync(path.join(__dirname, '../photo.png'))

describe('member service unit tests', () => {
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

  describe('get member tests', () => {
    it('get member successfully 1', async () => {
      const result = await service.getMember({ isMachine: true }, member1.handle, {})
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
      const result = await service.getMember({ handle: 'test', roles: ['role'] }, member1.handle, {
        fields: 'userId,firstName,lastName,email,addresses'
      })
      should.equal(result.userId, member1.userId)
      should.equal(result.firstName, member1.firstName)
      should.equal(result.lastName, member1.lastName)
      // identifiable fields should not be returned
      should.not.exist(result.email)
      should.not.exist(result.addresses)
    })

    it('get member - not found', async () => {
      try {
        await service.getMember({ isMachine: true }, 'other', {})
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member - invalid field', async () => {
      try {
        await service.getMember({ isMachine: true }, member1.handle, { fields: 'invalid' })
      } catch (e) {
        should.equal(e.message, 'Invalid member field: invalid')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member - duplicate fields', async () => {
      try {
        await service.getMember({ isMachine: true }, member1.handle, { fields: 'email,email' })
      } catch (e) {
        should.equal(e.message, 'Duplicate member field: email')
        return
      }
      throw new Error('should not reach here')
    })

    it('get member - unexpected query parameter', async () => {
      try {
        await service.getMember({ isMachine: true }, member1.handle, { invalid: 'email' })
      } catch (e) {
        should.equal(e.message.indexOf('"invalid" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('verify email tests', () => {
    it('verify email - wrong token', async () => {
      try {
        await service.verifyEmail({ isMachine: true }, member1.handle, { token: 'wrong' })
      } catch (e) {
        should.equal(e.message, 'Wrong verification token.')
        return
      }
      throw new Error('should not reach here')
    })

    it('verify email successfully 1', async () => {
      const result = await service.verifyEmail({ isMachine: true }, member1.handle, {
        token: member1.emailVerifyToken
      })
      should.equal(result.emailChangeCompleted, false)
      should.equal(result.verifiedEmail, member1.email)
    })

    it('verify email successfully 2', async () => {
      const result = await service.verifyEmail({ isMachine: true }, member1.handle, {
        token: member1.newEmailVerifyToken
      })
      should.equal(result.emailChangeCompleted, true)
      should.equal(result.verifiedEmail, member1.newEmail)
    })

    it('verify email - not found', async () => {
      try {
        await service.verifyEmail({ isMachine: true }, 'other', { token: 'test' })
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('verify email - missing token', async () => {
      try {
        await service.verifyEmail({ isMachine: true }, member1.handle, {})
      } catch (e) {
        should.equal(e.message.indexOf('"token" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('verify email - unexpected query parameter', async () => {
      try {
        await service.verifyEmail({ isMachine: true }, member1.handle, { token: 'abc', invalid: 'email' })
      } catch (e) {
        should.equal(e.message.indexOf('"invalid" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('update member tests', () => {
    it('update member successfully', async () => {
      const result = await service.updateMember({ isMachine: true, sub: 'sub1' }, member2.handle, {
        verifyUrl: 'http://test.com/verify'
      }, {
        userId: 999,
        firstName: 'fff',
        lastName: 'lll',
        description: 'updated desc',
        email: 'new-email@test.com'
      })
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
      should.equal(result.updatedBy, 'sub1')
    })

    it('update member - not found', async () => {
      try {
        await service.updateMember({ isMachine: true, sub: 'sub1' }, 'other', {
          verifyUrl: 'http://test.com/verify'
        }, {
          userId: 999
        })
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('update member - invalid verifyUrl', async () => {
      try {
        await service.updateMember({ isMachine: true, sub: 'sub1' }, member2.handle, {
          verifyUrl: 'abc'
        }, {
          userId: 999
        })
      } catch (e) {
        should.equal(e.message.indexOf('"verifyUrl" must be a valid uri') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('update member - invalid userId', async () => {
      try {
        await service.updateMember({ isMachine: true, sub: 'sub1' }, member2.handle, {
          verifyUrl: 'http://test.com/verify'
        }, {
          userId: 'abc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"userId" must be a number') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('update member - invalid email', async () => {
      try {
        await service.updateMember({ isMachine: true, sub: 'sub1' }, member2.handle, {
          verifyUrl: 'http://test.com/verify'
        }, {
          email: 'abc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"email" must be a valid email') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('update member - unexpected field', async () => {
      try {
        await service.updateMember({ isMachine: true, sub: 'sub1' }, member2.handle, {
        }, {
          other: 'abc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('upload photo tests', () => {
    it('upload photo successfully', async () => {
      const result = await service.uploadPhoto({ handle: 'admin', roles: ['admin'] }, member2.handle, {
        photo: {
          data: photoContent,
          mimetype: 'image/png',
          name: 'photo.png',
          size: photoContent.length
        }
      })
      should.equal(result.photoURL.startsWith(config.PHOTO_URL_TEMPLATE.replace('<key>', '')), true)
    })

    it('upload photo - not found', async () => {
      try {
        await service.uploadPhoto({ handle: 'admin', roles: ['admin'] }, 'other', {
          photo: {
            data: photoContent,
            mimetype: 'image/png',
            name: 'photo.png',
            size: photoContent.length
          }
        })
      } catch (e) {
        should.equal(e.message, 'Member with handle: "other" doesn\'t exist')
        return
      }
      throw new Error('should not reach here')
    })

    it('upload photo - invalid file field', async () => {
      try {
        await service.uploadPhoto({ handle: 'admin', roles: ['admin'] }, member2.handle, {
          invalid: {
            data: photoContent,
            mimetype: 'image/png',
            name: 'photo.png',
            size: photoContent.length
          }
        })
      } catch (e) {
        should.equal(e.message.indexOf('"photo" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('upload photo - missing file', async () => {
      try {
        await service.uploadPhoto({ handle: 'admin', roles: ['admin'] }, member2.handle, {})
      } catch (e) {
        should.equal(e.message.indexOf('"photo" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('upload photo - empty handle', async () => {
      try {
        await service.uploadPhoto({ handle: 'admin', roles: ['admin'] }, '', {
          photo: {
            data: photoContent,
            mimetype: 'image/png',
            name: 'photo.png',
            size: photoContent.length
          }
        })
      } catch (e) {
        should.equal(e.message.indexOf('"handle" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('upload photo - unexpected field', async () => {
      try {
        await service.uploadPhoto({ handle: 'admin', roles: ['admin'] }, member2.handle, {
          photo: {
            data: photoContent,
            mimetype: 'image/png',
            name: 'photo.png',
            size: photoContent.length
          },
          other: 'invalid'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
