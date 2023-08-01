/**
 * Export the photo URLs from the ES index, for updating.
 */

require('../../app-bootstrap')
const _ = require('lodash')
const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')

const indexName = "members-2020-01"
const indexType = "profiles"

const esClient = helper.getESClient()
const fs = require('fs');
const { getMember } = require('../services/MemberService')

async function getMemberTraits () {
    console.log('Getting all member traits')
    const searchResults = {hits:{hits:[]}}
    const responseQueue = []

    const esQueryTraits = {
      index: config.ES.MEMBER_TRAIT_ES_INDEX,
      type: config.ES.MEMBER_TRAIT_ES_TYPE,
      size: 10000,
      scroll: '90s'
    }
  

    const response = await esClient.search(esQueryTraits)

    responseQueue.push(response)
    while (responseQueue.length) {
        const body = responseQueue.shift()
        console.log("Loading traits: " + searchResults.hits.hits.length + " of: " + body.hits.total)

        // collect the titles from this response
        body.hits.hits.forEach(function (hit) {
            searchResults.hits.hits.push(hit)
            //searchResults.push(hit._source.quote)
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
    console.log("Loading members: " + searchResults.hits.hits.length + " of: " + body.hits.total)
    
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

function profileCompleteness(member){
  let completeItems = 0

  // Magic number - 6 total items for profile "completeness"
  // TODO: Bump this back up to 7 once verification is implemented
  const totalItems = 6

  response = {}

  response.skills = false
  response.gigAvailability = false
  response.bio = false
  response.profilePicture = false
  response.workHistory = false
  response.education = false
  response.percentComplete = 0.0

  _.forEach(member.traits, (item) => {
    if(item.traitId=="education" && item.traits.data.length > 0){
      completeItems += 1
      response.education = true
    }
    // TODO: Do we use the short bio or the "description" field of the member object?
    if(item.traitId=="personalization" && item.traits.data[0].gigAvailability != null) {
      completeItems += 1
      response.gigAvailability = true
    }
    if(item.traitId=="work" && item.traits.data.length > 0){
      completeItems += 1
      response.workHistory = true
    }
    
  })

  // TODO: Do we use the short bio or the "description" field of the member object?
  if(member.description) {
    completeItems += 1
    response.bio = true
  }

  //Must have at least 3 skills entered
  if(member.emsiSkills && member.emsiSkills.length >= 3 ){
    completeItems += 1
    response.skills=true
  }

  if(member.photoURL){
    completeItems += 1
    response.profilePicture = true
  }

  // Calculate the percent complete and round to 2 decimal places
  response.percentComplete = Math.round(completeItems / totalItems * 100) / 100
  return response
}

fs.writeFileSync("profile_data.csv","",{encoding:'utf8',flag:'w'})

getESData()
  .then(result => {
    getMemberTraits()
        .then(traits => {
            if (result.length === 0) {
              console.log('No member records found.')
            } else {
              const members = _.map(result, (item) => item._source)
              const memberTraits = _.map(traits, (item) => item._source)
              const memberTraitsKeys = _.keyBy(memberTraits, 'userId')
              
              const membersWithTraits = _.map(members, function (item) {
                if (memberTraitsKeys[item.userId]) {
                  item.traits = memberTraitsKeys[item.userId]
                } else {
                  item.traits = []
                }
                return item
              })
              const headerRow = "Handle, Skills, Gig Availability, Bio, Profile Pic, Work History, Education, Percent Complete\r\n"
              fs.appendFileSync('profile_data.csv', headerRow)
              membersWithTraits.forEach(member => {
                const completeness = profileCompleteness(member)
                const memberRow = `"${member.handle}",${completeness.skills},${completeness.gigAvailability},${completeness.bio},${completeness.profilePicture},${completeness.workHistory},${completeness.education},${completeness.percentComplete}\r\n`
                fs.appendFileSync('profile_data.csv', memberRow)
              });
            }
            process.exit()
        })
  })
  .catch(err => {
    logger.logFullError(err)
    process.exit(1)
  })
