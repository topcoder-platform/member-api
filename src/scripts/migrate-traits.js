/**
 * Export the photo URLs from the ES index, for updating.
 */

require('../../app-bootstrap')
const _ = require('lodash')
const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')

const constants = require('../../app-constants')
const fs = require('fs');

const esClient = helper.getESClient()

require('aws-sdk/lib/maintenance_mode_message').suppress = true;

process.on('unhandledRejection', (error) => {
    console.log(`Unhandled rejection reason: ${JSON.stringify(error, null, 5)}`)
})

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

async function migrateMemberData(member, applyForReal) {
    let skillScoreDeduction = 0
    let workHistory = false
    let education = false
    const dbMember = await helper.getMemberByHandle(member.handle)

    let education_trait = _.find(member.traits, function(trait){ return trait.traitId == "education"})
    console.log(member.handle, "Found education trait", JSON.stringify(education_trait, null, 5))
    if(education_trait && education_trait.traits.data && education == false){
      education = true
    }
  
    let work_trait = _.find(member.traits, function(trait){ return trait.traitId == "work"})
    console.log(member.handle, "Found work trait", JSON.stringify(education_trait, null, 5))
    if(work_trait && work_trait.traits.data && workHistory==false){
      workHistory = true
    }
  
    let personalization_trait = _.find(member.traits, function(trait){ return trait.traitId == "personalization"})
    console.log(member.handle, "Found personalization trait", JSON.stringify(personalization_trait, null, 5))
    if(personalization_trait && personalization_trait.traits.data && personalization_trait.traits.data.namesAndHandleAppearance){
        dbMember.namesAndHandleAppearance = personalization_trait.traits.data.namesAndHandleAppearance
    }

    if(personalization_trait && personalization_trait.traits.data && personalization_trait.traits.data.availableForGigs){
        dbMember.availableForGigs = personalization_trait.traits.data.availableForGigs
    }
  
    // TAL-77 : missing experience, reduce match by 2%
    if(!workHistory){
      skillScoreDeduction = skillScoreDeduction - 0.02
    }
  
    // TAL-77 : missing education, reduce match by 2%
    if(!education){
      skillScoreDeduction = skillScoreDeduction - 0.02
    }
    
    dbMember.skillScoreDeduction = skillScoreDeduction
    //await helper.update(member, {})
    console.log(dbMember.handle, "Skill score deduction", skillScoreDeduction)
    console.log(dbMember.handle, "Names and handle appearance", dbMember.namesAndHandleAppearance)
    console.log(dbMember.handle, "Available for gigs", dbMember.availableForGigs)
    if(applyForReal){
        try{
            const result = await helper.update(dbMember, {"skillScoreDeduction":skillScoreDeduction})
            // update member in es, informix via bus event
            await helper.postBusEvent(constants.TOPICS.MemberUpdated, result.originalItem())
            StylePropertyMap()
            const successContent = `Updated ${dbMember.handle} successfully\r\n`
            fs.appendFileSync('update_success.log', successContent)
            console.log(successContent)
            // Wait 1/2 second so we don't overload Kafka or the processor
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (e) {
            const errorContent = `Update to ${dbMember.handle} failed due to ${JSON.stringify(e)}\r\n`
            fs.appendFileSync('update_failure.log', errorContent)
            console.log(errorContent)
        }

    }
  }
  

function processUpdates(applyForReal){
    console.log("------------------------------------------------------------")
    if(applyForReal){
      console.log(">>> Applying to actual records!")
    }
    else{
      console.log("Testing upgrade, no actual changes will be written")
    }
    console.log("------------------------------------------------------------")
    // Reset the output files
    fs.writeFileSync("update_success.log","",{encoding:'utf8',flag:'w'})
    fs.writeFileSync("update_failure.log","",{encoding:'utf8',flag:'w'})
    fs.writeFileSync("update_skipped.log","",{encoding:'utf8',flag:'w'})
  
    getESData()
    .then(result => {
        getMemberTraits()
            .then(traits => {
                const memberTraits = _.map(traits, (item) => item._source)
                const members = _.map(result, (item) => item._source)
                const membersWithTraits = _.map(members, function (item) {
                traits = memberTraits.filter( member => member.userId === item.userId)
                if (traits && traits.length>0) {
                    item.traits = traits
                } else {
                    item.traits = []
                }
                return item
                })
                _.forEach(membersWithTraits, async function (memberWithTraits) {
                    await migrateMemberData(memberWithTraits, applyForReal);
                });
            })      
        })
    .catch(err => {
        logger.logFullError(err)
        process.exit(1)
    })
  }
  // ----------------------------------------------------------------------------------------------------------------
  applyForReal = false

  if(process.argv.length>=2){
      applyForReal = "apply" === process.argv[2]
  }
  
  if(applyForReal){
      const readline = require('readline').createInterface({
         input: process.stdin,
         output: process.stdout
      });
        
      readline.question('Are you sure you want to apply the index update to the real records? (y/n)  ', promptResponse => {
        readline.close();
        if(promptResponse != 'y'){
            process.exit()
        }
        else{
            processUpdates(applyForReal)
        }
      });
  }
  else{
    processUpdates(applyForReal)
  }
  