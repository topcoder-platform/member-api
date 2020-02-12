/**
 * This defines Member model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  handleLower: {
    type: String,
    hashKey: true,
    required: true
  },
  maxRating: {
    type: Object,
    required: false
  },
  userId: {
    type: Number,
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
  email: {
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
    type: Date,
    required: false
  },
  newEmailVerifyToken: {
    type: String,
    required: false
  },
  newEmailVerifyTokenDate: {
    type: Date,
    required: false
  },
  addresses: {
    type: [Object],
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
    type: [String],
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
  throughput: { read: 4, write: 2 }
})

module.exports = schema
