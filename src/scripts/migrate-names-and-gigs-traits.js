/**
 * This script moves the namesAndHandleAppearance and availableForGigs fields from the traits to the main member index
 * It also does the pre-calculation for the skill-score deduction, to be used in talent search
 */

require('../../app-bootstrap')
const _ = require('lodash')
const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')
const eshelper = require('../common/eshelper')

const constants = require('../../app-constants')
const fs = require('fs');

const esClient1 = helper.getESClient()
const esClient2 = helper.getESClient()

require('aws-sdk/lib/maintenance_mode_message').suppress = true;

// process.on('unhandledRejection', (error) => {
//     console.log(`Unhandled rejection reason: ${JSON.stringify(error, null, 5)}`)
// })

async function migrateMemberData(member, applyForReal) {
  let skillScoreDeduction = 0
   let workHistory = false
   let education = false
   try{
      const dbMember = await helper.getMemberByHandle(member.handle)
    
      let education_trait = _.find(member.traits, function(trait){ return trait.traitId == "education"})
      if(education_trait && education_trait.traits.data && education == false){
        education = true
      }
    
      let work_trait = _.find(member.traits, function(trait){ return trait.traitId == "work"})

      if(work_trait && work_trait.traits.data && workHistory==false){
        workHistory = true
      }
    
      let personalization_trait = _.find(member.traits, function(trait){ return trait.traitId == "personalization"})

      if(personalization_trait && personalization_trait.traits.data && personalization_trait.traits.data.namesAndHandleAppearance !== null ){
          if(dbMember.namesAndHandleAppearance == null){
            dbMember.namesAndHandleAppearance = personalization_trait.traits.data.namesAndHandleAppearance
          }
      }

      if(personalization_trait && personalization_trait.traits.data && personalization_trait.traits.data.availableForGigs !== null ){
        if(dbMember.availableForGigs == null){
          dbMember.availableForGigs = personalization_trait.traits.data.availableForGigs
        }
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
      
      if(applyForReal && (dbMember.namesAndHandleAppearance != null ||  dbMember.availableForGigs != null)){
          try{
              const result = await helper.update(dbMember, { "skillScoreDeduction" : skillScoreDeduction,
                                                              "namesAndHandleAppearance": dbMember.namesAndHandleAppearance,
                                                              "availableForGigs": dbMember.availableForGigs})
              // update member in es, informix via bus event
              await helper.postBusEvent(constants.TOPICS.MemberUpdated, result.originalItem())
              const successContent = `Updated ${dbMember.handle} successfully\r\n`
              console.log(successContent)
              fs.appendFileSync('update_success.log', successContent)
              // Wait 1/4 second so we don't overload Kafka or the processor
              await new Promise(resolve => setTimeout(resolve, 250));

          } catch (e) {
              console.log(e)
              const errorContent = `Update to ${dbMember.handle} failed due to ${JSON.stringify(e)}\r\n`
              fs.appendFileSync('update_failure.log', errorContent)
              console.log(errorContent)
          }
      }
    }
    catch(err){
      return
    }
}
  

async function processUpdates(applyForReal){
  console.log("------------------------------------------------------------")
  if(applyForReal){
    console.log(">>> Applying to actual records! <<<<")
  }
  else{
    console.log("Testing upgrade, no actual changes will be written")
  }
  console.log("------------------------------------------------------------")
  // Reset the output files
  fs.writeFileSync("update_success.log","",{encoding:'utf8',flag:'w'})
  fs.writeFileSync("update_failure.log","",{encoding:'utf8',flag:'w'})
  
  const responseQueue = []
  try{
    // construct ES query for all members
    const esQueryAll = {
      index: config.get('ES.MEMBER_PROFILE_ES_INDEX'),
      type: config.get('ES.MEMBER_PROFILE_ES_TYPE'),
      size: 100,
      scroll: '120s',
    }

    // search with constructed query
    // const response = await esClient1.search(esQueryAll)
    const response = config.get("ES.OPENSEARCH") == "false"
    ? await esClient1.search(esQueryAll)
    : (await esClient1.search(esQueryAll)).body;

    responseQueue.push(response)

    // Get the members in 10000 record "chunks" and process them immediately, to save memory space
    currentProcessed = 0
    while (responseQueue.length) {
      const body = responseQueue.shift()
      let toProcess = []
      let query = {}
    
      // collect the titles from this response
      body.hits.hits.forEach(function (hit) {
        toProcess.push(hit._source)
        currentProcessed++
      })
      query.handlesLower = _.map(toProcess, 'handleLower')
      query.memberIds = _.map(toProcess, 'userId')

      //console.log("Query", JSON.stringify(query, null, 5))
      const docsTraits = await eshelper.getMemberTraits(query, esClient2)
      const mbrsTraits = _.map(docsTraits.hits.hits, (item) => item._source)
      let resultsWithTraits = _.map(toProcess, function (item) {
        item.traits = []
        let memberTraits = _.filter(mbrsTraits, ['userId', item.userId])
        item.traits = memberTraits
        return item
      })

      _.forEach(resultsWithTraits, async function (memberWithTraits) {
         await migrateMemberData(memberWithTraits, applyForReal);
      });

      //console.log(JSON.stringify(toProcess,null, 5))
      console.log("Processed members: " + currentProcessed + " of: " + body.hits.total)
      // get the next response if there are more results to fetch
      responseQueue.push(
        await esClient1.scroll({
          scroll_id: body._scroll_id,
          scroll: '90s'
        })
      )
    }
  }
  catch(err){
      logger.logFullError(err)
      process.exit(1)
  }
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
  