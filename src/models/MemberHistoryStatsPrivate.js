/**
 * This defines Member History Stats model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  userId: {
    type: Number,
    hashKey: true,
    required: true
  },
  groupId: {
    type: Number,
    rangeKey: true,
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
  DEVELOP: {
    type: String,
    required: false
  },
  DATA_SCIENCE: {
    type: String,
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
