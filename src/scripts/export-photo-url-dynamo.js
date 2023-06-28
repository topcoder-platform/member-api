/**
 * Export the photo URLs from the ES index, for updating.
 */

require('../../app-bootstrap')
const _ = require('lodash')
const models = require('../models')
const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')


async function getDynamoData () {
  const fieldNames = ["handleLower", "photoURL"]
  const records = await helper.scan("Member")
  if (!records || records.length === 0) {
    logger.info('No records')
  } else {
    return records
  }
  return []
}

getDynamoData()
  .then(result => {
    if (result.length === 0) {
      console.log('No member records found.')
    } else {
      console.log(result.length + " records")
      result.forEach(element => {
        if(element.photoURL){
         console.log(element.handleLower + "," + element.photoURL)
        }
      });
    }
    process.exit()
  })
  .catch(err => {
    logger.logFullError(err)
    process.exit(1)
  })
