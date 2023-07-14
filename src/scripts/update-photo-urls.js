/**
 * Export the photo URLs from the ES index, for updating.
 */

require('../../app-bootstrap')
const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')
const constants = require('../../app-constants')
const models = require('../models')

const esClient = helper.getESClient()
const fs = require('fs');

require('aws-sdk/lib/maintenance_mode_message').suppress = true;

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at ', promise, `reason: ${err.message}`)
    process.exit(1)
  })

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

  // search with constructed query to grab all members
  const response = await esClient.search(esQueryAll)

  responseQueue.push(response)

  while (responseQueue.length) {
    const body = responseQueue.shift()
    console.log("Loading records: " + searchResults.hits.hits.length + " of: " + body.hits.total)
    
    // collect the members from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
    })

    // check to see if we have collected all of the members
    if (body.hits.total === searchResults.hits.hits.length) {
      searchResults.hits.total=body.hits.total
      break
    }

    //get the next response if there are more members to fetch
    responseQueue.push(
      await esClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults.hits.hits || []
}

function getNewURL(useDevEnvironment, oldURL){
    var newURL = oldURL
    var prefix1 = 'https://topcoder-dev-media.s3.amazonaws.com'
    var prefix2 = 'https://topcoder-dev-media.s3.us-east-1.amazonaws.com'
    var prefix3 = 'http://cs-public.s3.amazonaws.com'
    var newPrefix = 'https://member-media.topcoder-dev.com'
    
    if(!useDevEnvironment){
        prefix1 = 'https://topcoder-prod-media.s3.amazonaws.com'
        prefix2 = 'https://topcoder-prod-media.s3.us-east-1.amazonaws.com'        
        newPrefix = 'https://member-media.topcoder.com'
    }

    if(oldURL.startsWith(prefix1)){
        newURL = oldURL.replace(prefix1, newPrefix)
    }
    else if(oldURL.startsWith(prefix2)){
        newURL = oldURL.replace(prefix2, newPrefix)
    }
    else if(oldURL.startsWith(prefix3)){
        // Set to null, which will cause these to be removed, forcing the user to re-add their pic
        newURL = null
    }
    return newURL
}

async function updateURLForMember(handle, newURL){
    const dynamoMember = await helper.getMemberByHandle(handle)
    dynamoMember.updatedAt = new Date().getTime()
    if(newURL) {
        dynamoMember.photoURL = newURL
    }
    else {
        // Remove the photoURL for those weird cs-public.s3.amazonaws.com URLs, 
        // forcing members to reset their profile pic
        dynamoMember.photoURL = null
    }
    const result = await helper.update(dynamoMember, {})
    helper.postBusEvent(constants.TOPICS.MemberUpdated, result.originalItem())      
}

async function updateURLs(results, useDevEnvironment, applyForReal){
    let successCount=0
    console.log(`Processing ${results.length} member records`)
    for (let i = 0; i < results.length; i++){
        const member = results[i]
        if(member._source && member._source.photoURL){
            const oldURL = member._source.photoURL
            const newURL = getNewURL(useDevEnvironment, oldURL)

            if(oldURL != newURL){
                try{
                    if(applyForReal){
                        await updateURLForMember(member._source.handle, newURL)
                        // Wait 1/2 second so we don't overload Kafka or the processor
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    const successContent = `Updated ${member._source.handle} from ${oldURL} to ${newURL}\r\n`
                    fs.appendFileSync('update_success.log', successContent)
                    console.log(successContent)
                    successCount = successCount+1
                } catch (e) {
                    const errorContent = `Updated ${member._source.handle} from ${oldURL} to ${newURL} failed due to ${JSON.stringify(e)}\r\n`
                    fs.appendFileSync('update_failure.log', errorContent)
                    console.log(errorContent)
                }
            }
            else{
                const successContent = `Not updating ${member._source.handle} from ${oldURL}\r\n`
                fs.appendFileSync('update_skipped.log', successContent)
            }
        }
    }
    return successCount
}

function processUpdates(useDevEnvironment, applyForReal){
  console.log("------------------------------------------------------------")
  if(applyForReal){
    console.log(">>> Applying to actual records!")
    if(useDevEnvironment){
      console.log(">>> Using the DEV environment")
    } else {
      console.log(">>> Using the PROD environment!")
    }
  }
  else{
    console.log("Testing upgrade, no actual changes will be written")
    if(useDevEnvironment){
        console.log("Using the DEV environment")
    } else {
        console.log("Using the PROD environment")
    }
  }
  console.log("------------------------------------------------------------")
  // Reset the output files
  fs.writeFileSync("update_success.log","",{encoding:'utf8',flag:'w'})
  fs.writeFileSync("update_failure.log","",{encoding:'utf8',flag:'w'})
  fs.writeFileSync("update_skipped.log","",{encoding:'utf8',flag:'w'})

  getESData()
    .then(result => {
      if (result.length === 0) {
        console.log('No member records found.')
      } else {
        updateURLs(result, useDevEnvironment, applyForReal).then(upgradeResult => {
          console.log(`Updated ${upgradeResult} member records`)
        })
      }
    })
    .catch(err => {
      console.log(err)
      process.exit(1)
  })
}
applyForReal = false
useDevEnvironment = true

if(process.argv.length>=2){
    useDevEnvironment = "prod" != process.argv[2]
}

if(process.argv.length>=3){
    applyForReal = "apply" === process.argv[3]
}

if(applyForReal){
    const readline = require('readline').createInterface({
       input: process.stdin,
       output: process.stdout
    });
      
    readline.question(`Are you sure you want to apply the update to the real records in ${useDevEnvironment ? 'dev' : 'prod'} (y/n)  `, promptResponse => {
      readline.close();
      if(promptResponse != 'y'){
        process.exit()
      }
      else{
        processUpdates(useDevEnvironment, applyForReal)
      }
    });
}
else{
  processUpdates(useDevEnvironment, applyForReal)
}
