/**
 * This defines Member Trait model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  userId: {
    type: Number,
    hashKey: true,
    required: true,
    index: [{
      name: 'userId-index',
      global: true,
      project: true
    }]
  },
  traitId: {
    type: String,
    rangeKey: true,
    required: true,
    index: [{
      name: 'traitId-index',
      global: true,
      project: true
    }]
  },
  categoryName: {
    type: String,
    required: false
  },
  traits: {
    type: String,
    required: false
  },
  createdAt: {
    type: String,
    required: false
  },
  updatedAt: {
    type: String,
    required: false
  },
  createdBy: {
    type: Number,
    required: false
  },
  updatedBy: {
    type: Number,
    required: false
  }
},
{
  throughput: { read: 4, write: 2 }
})

module.exports = schema
