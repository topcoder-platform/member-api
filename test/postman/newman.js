const config = require('config')
const apiTestLib = require('tc-api-testing-lib')
const helper = require('./testHelper')
const logger = require('../../src/common/logger')

const healthCheckRequests = [
  {
    folder: 'health check',
    iterationData: require('./testData/health/health-check.json')
  }
]

const memberRequests = [
  {
    folder: 'get member successfully',
    iterationData: require('./testData/member/get-member-successfully.json')
  },
  {
    folder: 'get member with fields successfully',
    iterationData: require('./testData/member/get-member-with-fields-successfully.json')
  },
  {
    folder: 'get member by invalid token',
    iterationData: require('./testData/member/get-member-by-invalid-token.json')
  },
  {
    folder: 'get member by invalid field',
    iterationData: require('./testData/member/get-member-by-invalid-field.json')
  },
  {
    folder: 'get member by nonexistent memberHandle',
    iterationData: require('./testData/member/get-member-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'search members successfully',
    iterationData: require('./testData/member/search-members-successfully.json')
  },
  {
    folder: 'search members by invalid token',
    iterationData: require('./testData/member/search-members-by-invalid-token.json')
  },
  {
    folder: 'search members autocomplete successfully',
    iterationData: require('./testData/member/search-members-autocomplete-successfully.json')
  },
  {
    folder: 'search members autocomplete successfully 2',
    iterationData: require('./testData/member/search-members-autocomplete-successfully-2.json')
  },
  {
    folder: 'update member successfully',
    iterationData: require('./testData/member/update-member-successfully.json')
  },
  {
    folder: 'update member by invalid token',
    iterationData: require('./testData/member/update-member-by-invalid-token.json')
  },
  {
    folder: 'update member by no admin',
    iterationData: require('./testData/member/update-member-by-no-admin.json')
  },
  {
    folder: 'update member by nonexistent memberHandle',
    iterationData: require('./testData/member/update-member-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'update member by invalid field',
    iterationData: require('./testData/member/update-member-by-invalid-field.json')
  },
  {
    folder: 'update member by existent email',
    iterationData: require('./testData/member/update-member-by-existent-email.json')
  },
  {
    folder: 'update member email successfully',
    iterationData: require('./testData/member/update-member-email-successfully.json')
  },
  {
    folder: 'verify email by invalid token',
    iterationData: require('./testData/member/verify-email-by-invalid-token.json')
  },
  {
    folder: 'verify email by unauthorized user',
    iterationData: require('./testData/member/verify-email-by-unauthorized-user.json')
  },
  {
    folder: 'verify email by wrong verification token',
    iterationData: require('./testData/member/verify-email-by-wrong-verification-token.json')
  },
  {
    folder: 'verify email by nonexistent memberHandle',
    iterationData: require('./testData/member/verify-email-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'get verification code form mock api',
    iterationData: require('./testData/member/get-verification-code-from-mock-api.json')
  },
  {
    folder: 'verify old email successfully',
    iterationData: require('./testData/member/verify-old-email-successfully.json')
  },
  {
    folder: 'verify new email successfully',
    iterationData: require('./testData/member/verify-new-email-successfully.json')
  },
  {
    folder: 'upload photo successfully',
    iterationData: require('./testData/member/upload-photo-successfully.json')
  },
  {
    folder: 'upload photo by invalid token',
    iterationData: require('./testData/member/upload-photo-by-invalid-token.json')
  },
  {
    folder: 'upload photo by unauthorized user',
    iterationData: require('./testData/member/upload-photo-by-unauthorized-user.json')
  },
  {
    folder: 'upload photo by nonexistent memberHandle',
    iterationData: require('./testData/member/upload-photo-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'upload photo by invalid field',
    iterationData: require('./testData/member/upload-photo-by-invalid-field.json')
  }
]

const traitRequests = [
  {
    folder: 'create trait successfully',
    iterationData: require('./testData/trait/create-trait-successfully.json')
  },
  {
    folder: 'create trait by invalid token',
    iterationData: require('./testData/trait/create-trait-by-invalid-token.json')
  },
  {
    folder: 'create trait by unauthorized user',
    iterationData: require('./testData/trait/create-trait-by-unauthorized-user.json')
  },
  {
    folder: 'create trait by nonexistent memberHandle',
    iterationData: require('./testData/trait/create-trait-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'create trait by existent trait',
    iterationData: require('./testData/trait/create-trait-by-existent-trait.json')
  },
  {
    folder: 'create trait by invalid field',
    iterationData: require('./testData/trait/create-trait-by-invalid-field.json')
  },
  {
    folder: 'get traits successfully',
    iterationData: require('./testData/trait/get-traits-successfully.json')
  },
  {
    folder: 'get traits by invalid token',
    iterationData: require('./testData/trait/get-traits-by-invalid-token.json')
  },
  {
    folder: 'get traits by unauthorized user',
    iterationData: require('./testData/trait/get-traits-by-unauthorized-user.json')
  },
  {
    folder: 'get traits by nonexistent memberHandle',
    iterationData: require('./testData/trait/get-traits-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'get traits by invalid field',
    iterationData: require('./testData/trait/get-traits-by-invalid-field.json')
  },
  {
    folder: 'update trait successfully',
    iterationData: require('./testData/trait/update-trait-successfully.json')
  },
  {
    folder: 'update trait by invalid token',
    iterationData: require('./testData/trait/update-trait-by-invalid-token.json')
  },
  {
    folder: 'update trait by unauthorized user',
    iterationData: require('./testData/trait/update-trait-by-unauthorized-user.json')
  },
  {
    folder: 'update trait by nonexistent memberHandle',
    iterationData: require('./testData/trait/update-trait-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'update trait by nonexistent trait',
    iterationData: require('./testData/trait/update-trait-by-nonexistent-trait.json')
  },
  {
    folder: 'update trait by invalid field',
    iterationData: require('./testData/trait/update-trait-by-invalid-field.json')
  },
  {
    folder: 'delete trait by invalid token',
    iterationData: require('./testData/trait/delete-trait-by-invalid-token.json')
  },
  {
    folder: 'delete trait by unauthorized user',
    iterationData: require('./testData/trait/delete-trait-by-unauthorized-user.json')
  },
  {
    folder: 'delete trait by nonexistent memberHandle',
    iterationData: require('./testData/trait/delete-trait-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'delete trait by nonexistent trait',
    iterationData: require('./testData/trait/delete-trait-by-nonexistent-trait.json')
  },
  {
    folder: 'delete trait by invalid field',
    iterationData: require('./testData/trait/delete-trait-by-invalid-field.json')
  },
  {
    folder: 'delete trait successfully',
    iterationData: require('./testData/trait/delete-trait-successfully.json')
  }
]

const statisticsRequests = [
  {
    folder: 'get distribution successfully',
    iterationData: require('./testData/statistics/get-distribution-successfully.json')
  },
  {
    folder: 'get distribution by nonexistent track',
    iterationData: require('./testData/statistics/get-distribution-by-nonexistent-track.json')
  },
  {
    folder: 'get distribution by invalid field',
    iterationData: require('./testData/statistics/get-distribution-by-invalid-field.json')
  },
  {
    folder: 'get member stats successfully',
    iterationData: require('./testData/statistics/get-member-stats-successfully.json')
  },
  {
    folder: 'get member stats by nonexistent memberHandle',
    iterationData: require('./testData/statistics/get-member-stats-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'get member stats by invalid field',
    iterationData: require('./testData/statistics/get-member-stats-by-invalid field.json')
  },
  {
    folder: 'get member history stats successfully',
    iterationData: require('./testData/statistics/get-member-history-stats-successfully.json')
  },
  {
    folder: 'get member history stats by nonexistent memberHandle',
    iterationData: require('./testData/statistics/get-member-history-stats-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'get member history stats by invalid field',
    iterationData: require('./testData/statistics/get-member-history-stats-by-invalid field.json')
  },
  {
    folder: 'get member skills successfully',
    iterationData: require('./testData/statistics/get-member-skills-successfully.json')
  },
  {
    folder: 'get member skills by nonexistent memberHandle',
    iterationData: require('./testData/statistics/get-member-skills-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'get member skills by invalid field',
    iterationData: require('./testData/statistics/get-member-skills-by-invalid field.json')
  },
  {
    folder: 'update member skills successfully',
    iterationData: require('./testData/statistics/update-member-skills-successfully.json')
  },
  {
    folder: 'update member skills by invalid token',
    iterationData: require('./testData/statistics/update-member-skills-by-invalid-token.json')
  },
  {
    folder: 'update member skills by nonexistent memberHandle',
    iterationData: require('./testData/statistics/update-member-skills-by-nonexistent-memberHandle.json')
  },
  {
    folder: 'update member skills by unauthorized user',
    iterationData: require('./testData/statistics/update-member-skills-by-unauthorized-user.json')
  },
  {
    folder: 'update member skills by invalid field',
    iterationData: require('./testData/statistics/update-member-skills-by-invalid-field.json')
  }
]

const miscRequests = [
  {
    folder: 'get financial successfully',
    iterationData: require('./testData/misc/get-financial-successfully.json')
  }
]

const requests = [
  ...healthCheckRequests,
  ...memberRequests,
  ...traitRequests,
  ...statisticsRequests,
  ...miscRequests
]

/**
 * Clear the test data.
 * @return {Promise<void>}
 */
async function clearTestData () {
  logger.info('Clear the Postman test data.')
  await helper.postRequest(`${config.API_BASE_URL}/${config.API_VERSION}/internal/jobs/clean`)
  logger.info('Finished clear the Postman test data.')
}

/**
 * Run the postman tests.
 */
apiTestLib.runTests(requests, require.resolve('./member-api.postman_collection.json'),
  require.resolve('./member-api.postman_environment.json')).then(async () => {
  logger.info('newman test completed!')
  await clearTestData()
}).catch(async (err) => {
  logger.logFullError(err)
  // Only calling the clean up function when it is not validation error.
  if (err.name !== 'ValidationError') {
    await clearTestData()
  }
})
