/**
 * The mock APIs.
 */

const config = require('config')
const express = require('express')
const cors = require('cors')
const logger = require('../src/common/logger')
const _ = require('lodash')
const constants = require('../app-constants')
const helper = require('../src/common/helper')
const esClient = helper.getESClient()

const tags = [{ 'id': 286, 'name': 'Node.js', 'domain': 'SKILLS', 'status': 'APPROVED', 'categories': ['develop'], 'priority': 0, 'synonyms': null, 'createdAt': '2016-05-18', 'updatedAt': '2016-05-18', 'createdBy': 1, 'updatedBy': 1 },
  { 'id': 380, 'name': 'VB.NET', 'domain': 'SKILLS', 'status': 'APPROVED', 'categories': ['develop'], 'priority': 0, 'synonyms': null, 'createdAt': '2016-05-18', 'updatedAt': '2016-05-18', 'createdBy': 1, 'updatedBy': 1 },
  { 'id': 186, 'name': 'Force.Com Sites', 'domain': 'SKILLS', 'status': 'APPROVED', 'categories': ['develop'], 'priority': 0, 'synonyms': null, 'createdAt': '2016-05-18', 'updatedAt': '2016-05-18', 'createdBy': 1, 'updatedBy': 1 },
  { 'id': 382, 'name': 'Vert.X', 'domain': 'SKILLS', 'status': 'APPROVED', 'categories': ['develop'], 'priority': 0, 'synonyms': null, 'createdAt': '2016-05-18', 'updatedAt': '2016-05-18', 'createdBy': 1, 'updatedBy': 1 },
  { 'id': 311, 'name': 'Python', 'domain': 'SKILLS', 'status': 'APPROVED', 'categories': ['develop'], 'priority': 12, 'synonyms': null, 'createdAt': '2016-05-18', 'updatedAt': '2016-05-18', 'createdBy': 1, 'updatedBy': 1 },
  { 'id': 212, 'name': 'HTML', 'domain': 'SKILLS', 'status': 'APPROVED', 'categories': ['develop'], 'priority': 0, 'synonyms': null, 'createdAt': '2016-05-18', 'updatedAt': '2016-05-18', 'createdBy': 1, 'updatedBy': 1 }]

const app = express()
app.set('port', config.MOCK_API_PORT || 4000)
app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
  logger.info({ message: `${req.method} ${req.url}` })
  next()
})

app.get('/v3/tags', (req, res) => {
  res.status(200).json({ result: { content: tags } })
})

app.post('/v5/bus/events', async (req, res, next) => {
  try {
    if (req.body.topic === constants.TOPICS.MemberTraitCreated) {
      await esClient.create({
        index: config.ES.MEMBER_TRAIT_ES_INDEX,
        type: config.ES.MEMBER_TRAIT_ES_TYPE,
        id: req.body.payload.userId.toString() + '_' + req.body.payload.traitId,
        body: req.body.payload,
        refresh: 'true'
      })
    } else if (req.body.topic === constants.TOPICS.MemberTraitDeleted) {
      await Promise.all(_.map(req.body.payload.memberProfileTraitIds, async id =>
        esClient.delete({
          index: config.ES.MEMBER_TRAIT_ES_INDEX,
          type: config.ES.MEMBER_TRAIT_ES_TYPE,
          id: req.body.payload.userId.toString() + '_' + id,
          refresh: 'true'
        })))
    } else if (req.body.topic === constants.TOPICS.MemberTraitUpdated) {
      await esClient.update({
        index: config.ES.MEMBER_TRAIT_ES_INDEX,
        type: config.ES.MEMBER_TRAIT_ES_TYPE,
        id: req.body.payload.userId.toString() + '_' + req.body.payload.traitId,
        body: {
          doc: req.body.payload
        },
        refresh: 'true'
      })
    } else if (req.body.topic === constants.TOPICS.EmailChanged) {
      // do nothing
    } else if (req.body.topic === constants.TOPICS.MemberUpdated) {
      await esClient.update({
        index: config.ES.MEMBER_PROFILE_ES_INDEX,
        type: config.ES.MEMBER_PROFILE_ES_TYPE,
        id: req.body.payload.handleLower,
        body: {
          doc: req.body.payload
        },
        refresh: 'true'
      })
    }
    res.status(200).end()
  } catch (err) {
    next(err)
  }
})

app.get('/members/:handle/verify', async (req, res) => {
  const token = await esClient.get({
    index: config.ES.MEMBER_PROFILE_ES_INDEX,
    type: config.ES.MEMBER_PROFILE_ES_TYPE,
    id: req.params.handle.toLowerCase()
  })
  res.status(200).json({ emailVerifyToken: token._source.emailVerifyToken, newEmailVerifyToken: token._source.newEmailVerifyToken })
})

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' })
})

app.use((err, req, res, next) => {
  logger.logFullError(err, { signature: `${req.method}_${req.url}` })
  res.status(500).json({
    error: err.message
  })
})

app.listen(app.get('port'), '0.0.0.0', () => {
  logger.info({ message: `Mock Api listening on port ${app.get('port')}` })
})
