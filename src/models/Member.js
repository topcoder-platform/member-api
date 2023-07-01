/**
 * This defines Member model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  userId: {
    type: Number,
    hashKey: true,
    required: true
  },
  handleLower: {
    type: String,
    required: false,
    index: [{
      name: 'handleLower-index',
      global: true,
      project: true
    }]
  },
  email: {
    type: String,
    required: false,
    index: [
      {
        global: true,
        name: 'email-index'
      }]
  },
  verified: {
    type: Boolean,
    required: false
  },
  skillScore:{
    type: Number,
    required: false
  },
  maxRating: {
    type: Object,
    required: false
  },
  firstName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  otherLangName: {
    type: String,
    required: false
  },
  handle: {
    type: String,
    required: false
  },
  status: {
    type: String,
    required: false
  },
  newEmail: {
    type: String,
    required: false
  },
  emailVerifyToken: {
    type: String,
    required: false
  },
  emailVerifyTokenDate: {
    type: String,
    required: false
  },
  newEmailVerifyToken: {
    type: String,
    required: false
  },
  newEmailVerifyTokenDate: {
    type: String,
    required: false
  },
  addresses: {
    type: String,
    required: false
  },
  homeCountryCode: {
    type: String,
    required: false
  },
  competitionCountryCode: {
    type: String,
    required: false
  },
  photoURL: {
    type: String,
    required: false
  },
  tracks: {
    type: 'list',
    list: [String],
    required: false
  },
  createdAt: {
    type: Date,
    required: false
  },
  updatedAt: {
    type: Date,
    required: false
  },
  createdBy: {
    type: String,
    required: false
  },
  updatedBy: {
    type: String,
    required: false
  }
},
{
  throughput: { read: 100, write: 5 }
},
{
  useDocumentTypes: true
})

module.exports = schema
