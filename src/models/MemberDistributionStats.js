/**
 * This defines Member Distribution Stats model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  track: {
    type: String,
    hashKey: true,
    required: true
  },
  subTrack: {
    type: String,
    hashKey: true,
    required: false
  },
  distribution: {
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
