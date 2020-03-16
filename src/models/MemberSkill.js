/**
 * This defines Member Skill model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  userId: {
    type: Number,
    hashKey: true,
    required: true
  },
  handle: {
    type: String,
    required: true
  },
  handleLower: {
    type: String,
    required: true
  },
  skills: {
    type: Object,
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
