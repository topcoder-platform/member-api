/**
 * Migrate Data from Dynamo DB to ES
 */

const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')
const models = require('../models')
const _ = require('lodash')

const esClient = helper.getESClient()

async function indexResource (indexName, resource) {
  if (indexName == null) {
    console.log('Invalid index name')
    return
  }
  if (resource == null) {
    console.log('Invalid resource')
    return
  }
  try {
    await esClient.update({
      index: indexName,
      id: resource.id,
      body: { doc: resource, doc_as_upsert: true }
    })
  } catch (err) {
    console.log('Error indexing resource', resource.id, err)
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
    let results = await models['Resource'].scan().exec()
    let lastKey = results.lastKey
    count = 0
    for (const resource of results) {
      console.log(count++, 'Indexing', table, resource.id)
      await indexResource(getIndex(table), resource)
    }

    while (!_.isUndefined(results.lastKey)) {
      const results = await models['Resource'].scan().startAt(lastKey).exec()
      for (const resource of results) {
        console.log(count++, 'Indexing', table, resource.id)
        await indexResource(getIndex(table), resource)
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
