/**
 * Migrate Data from Dynamo DB to ES
 */

const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')
const models = require('../models')
const _ = require('lodash')

const esClient = helper.getESClient()

async function indexRecord (indexName, record) {
  if (indexName == null) {
    console.log('Invalid index name')
    return
  }
  if (record == null) {
    console.log('Invalid record')
    return
  }
  try {
    // index and log response code
    const response = await esClient.update({
      index: indexName,
      id: record.id,
      body: { doc: record, doc_as_upsert: true }
    })
    console.log('Indexed record', record.id, response.body.result)
  } catch (err) {
    console.log('Error indexing record', record.id, err)``
  }
}

function getIndex (table) {
  switch (table) {
    case 'MemberProfile':
      return config.get('ES.MEMBER_PROFILE_ES_INDEX')
    case 'MemberProfileTrait':
      return config.get('ES.MEMBER_TRAIT_ES_INDEX')
    case 'MemberStats':
      return config.get('ES.MEMBER_SKILLS_ES_INDEX')
  }
}

/*
 * Migrate records from DB to ES
 */
async function migrateRecords () {
  const tablesToIndex = ['MemberProfile', 'MemberProfileTrait', 'MemberStats']
  let count = 0
  for (const table of tablesToIndex) {
    console.log('Indexing table', table)
    let results = await models[table].scan().exec()
    let lastKey = results.lastKey
    count = 0
    for (const record of results) {
      console.log(count++, 'Indexing', table, record.id)
      await indexRecord(getIndex(table), record)
    }

    while (!_.isUndefined(results.lastKey)) {
      const results = await models[table].scan().startAt(lastKey).exec()
      for (const record of results) {
        console.log(count++, 'Indexing', table, record.id)
        await indexRecord(getIndex(table), record)
      }

      lastKey = results.lastKey
    }
  }
}

migrateRecords()
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
