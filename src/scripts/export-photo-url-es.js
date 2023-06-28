/**
 * Export the photo URLs from the ES index, for updating.
 */

require('../../app-bootstrap')
const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')

const indexName = "members-2020-01"
const indexType = "profiles"

const esClient = helper.getESClient()

async function getESData () {
  const searchResults = {hits:{hits:[]}}
  const responseQueue = []

  // construct ES query for all members
  const esQueryAll = {
    index: config.get('ES.MEMBER_PROFILE_ES_INDEX'),
    type: config.get('ES.MEMBER_PROFILE_ES_TYPE'),
    size: 10000,
    scroll: '90s',
  }

  
  // search with constructed query
  const response = await esClient.search(esQueryAll)

  responseQueue.push(response)

  while (responseQueue.length) {
    const body = responseQueue.shift()
    console.log("Loading records: " + searchResults.hits.hits.length + " of: " + body.hits.total)
    
    // collect the titles from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
    })

    // check to see if we have collected all of the quotes
    if (body.hits.total === searchResults.hits.hits.length) {
      searchResults.hits.total=body.hits.total
      break
    }

    // get the next response if there are more quotes to fetch
    responseQueue.push(
      await esClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults.hits.hits || []
}

getESData()
  .then(result => {
    if (result.length === 0) {
      console.log('No member records found.')
    } else {
      result.forEach(element => {
        if(element._source && element._source.photoURL){
         console.log(element._source.handle + "," + element._source.photoURL)
        }
      });
    }
    process.exit()
  })
  .catch(err => {
    logger.logFullError(err)
    process.exit(1)
  })
