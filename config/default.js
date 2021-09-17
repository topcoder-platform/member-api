/**
 * The configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  API_VERSION: process.env.API_VERSION || 'v5',
  AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
  VALID_ISSUERS: process.env.VALID_ISSUERS || '["https://api.topcoder-dev.com", "https://api.topcoder.com", "https://topcoder-dev.auth0.com/", "https://auth.topcoder-dev.com/"]',

  // used to get M2M token
  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://www.topcoder-dev.com',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,

  // bus API config params
  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',
  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',
  MEMBER_ERROR_TOPIC: process.env.MEMBER_ERROR_TOPIC || 'member.action.error',

  // tags config params
  TAGS: {
    TAGS_BASE_URL: process.env.TAGS_BASE_URL || 'https://api.topcoder-dev.com',
    TAGS_API_VERSION: process.env.TAGS_API_VERSION || '/v3',
    TAGS_FILTER: process.env.TAGS_FILTER || '/tags/?filter=domain%3DSKILLS%26status%3DAPPROVED&limit=1000'
  },
  GROUPS_API_URL: process.env.GROUPS_API_URL, // || 'https://api.topcoder-dev.com/v5/groups',
  // aws config params
  AMAZON: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    IS_LOCAL_DB: process.env.IS_LOCAL_DB ? process.env.IS_LOCAL_DB === 'true' : false,
    DYNAMODB_URL: process.env.DYNAMODB_URL || 'http://localhost:7777',
    PHOTO_S3_BUCKET: process.env.PHOTO_S3_BUCKET || 'topcoder-dev-media/member/profile',
    S3_API_VERSION: process.env.S3_API_VERSION || '2006-03-01'
  },

  // ES config params
  ES: {
    // above AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are used if we use AWS ES
    HOST: process.env.ES_HOST || 'localhost:9200',
    API_VERSION: process.env.ES_API_VERSION || '6.8',
    // member index
    MEMBER_PROFILE_ES_INDEX: process.env.MEMBER_PROFILE_ES_INDEX || 'members-2020-01',
    // member type, ES 6.x accepts only 1 Type per index and it's mandatory to define it
    MEMBER_PROFILE_ES_TYPE: process.env.MEMBER_PROFILE_ES_TYPE || 'profiles',
    MEMBER_TRAIT_ES_INDEX: process.env.MEMBER_TRAIT_ES_INDEX || 'membertraits-2020-01',
    MEMBER_TRAIT_ES_TYPE: process.env.MEMBER_TRAIT_ES_TYPE || 'profiletraits',
    MEMBER_STATS_ES_INDEX: process.env.MEMBER_STATS_ES_INDEX || 'memberstats-2020-01',
    MEMBER_STATS_ES_TYPE: process.env.MEMBER_STATS_ES_TYPE || 'stats',
    MEMBER_SKILLS_ES_INDEX: process.env.MEMBER_SKILLS_ES_INDEX || 'memberskills-2020-01',
    MEMBER_SKILLS_ES_TYPE: process.env.MEMBER_SKILLS_ES_TYPE || 'skills'
  },

  // health check timeout in milliseconds
  HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT || 3000,

  // file upload max size in bytes
  FILE_UPLOAD_SIZE_LIMIT: process.env.FILE_UPLOAD_SIZE_LIMIT
    ? Number(process.env.FILE_UPLOAD_SIZE_LIMIT) : 10 * 1024 * 1024, // 10M

  // photo URL template, its <key> will be replaced with S3 object key,
  // the URL is specific to AWS region and bucket, you may go to AWS console S3 service to
  // see bucket object URL to get the URL structure
  PHOTO_URL_TEMPLATE: process.env.PHOTO_URL_TEMPLATE || 'https://topcoder-dev-media.s3.us-east-1.amazonaws.com/member/profile/<key>',

  // verify token expiration in minutes
  VERIFY_TOKEN_EXPIRATION: process.env.VERIFY_TOKEN_EXPIRATION || 60,

  // the <emailVerifyToken> will be replaced with generated verify token
  EMAIL_VERIFY_AGREE_URL: process.env.EMAIL_VERIFY_AGREE_URL ||
    'http://www.topcoder-dev.com/settings/account/changeEmail?action=verify&token=<emailVerifyToken>',
  EMAIL_VERIFY_DISAGREE_URL: process.env.EMAIL_VERIFY_DISAGREE_URL ||
    'http://www.topcoder-dev.com/settings/account/changeEmail?action=cancel',

  // The M2M token scopes names for Member Create, Read, Update, Delete, and All
  SCOPES: {
    MEMBERS: {
      CREATE: process.env.SCOPE_MEMBERS_CREATE || 'create:user_profiles',
      READ: process.env.SCOPE_MEMBERS_READ || 'read:user_profiles',
      UPDATE: process.env.SCOPE_MEMBERS_UPDATE || 'update:user_profiles',
      DELETE: process.env.SCOPE_MEMBERS_DELETE || 'delete:user_profiles',
      ALL: process.env.SCOPE_MEMBERS_ALL || 'all:user_profiles'
    }
  },

  // Member identifiable info fields, only admin, M2M, or member himself can get these fields
  MEMBER_SECURE_FIELDS: process.env.MEMBER_SECURE_FIELDS
    ? process.env.MEMBER_SECURE_FIELDS.split(',')
    : ['firstName', 'lastName', 'email', 'addresses', 'createdBy', 'updatedBy'],

  // Member traits identifiable info fields, only admin, M2M, or member himself can fetch these fields
  MEMBER_TRAIT_SECURE_FIELDS: process.env.MEMBER_TRAIT_SECURE_FIELDS
    ? process.env.MEMBER_TRAIT_SECURE_FIELDS.split(',')
    : ['createdBy', 'updatedBy'],

  // Misc identifiable info fields, only admin, M2M, or member himself can fetch these fields
  MISC_SECURE_FIELDS: process.env.MISC_SECURE_FIELDS
    ? process.env.MISC_SECURE_FIELDS.split(',')
    : ['createdBy', 'updatedBy'],

  // Member Search identifiable info fields, only admin, M2M, or member himself can fetch these fields
  SEARCH_SECURE_FIELDS: process.env.SEARCH_SECURE_FIELDS
    ? process.env.SEARCH_SECURE_FIELDS.split(',')
    : ['firstName', 'lastName', 'email', 'addresses', 'createdBy', 'updatedBy'],

  // Member Statistics identifiable info fields, only admin, M2M, or member himself can fetch these fields
  STATISTICS_SECURE_FIELDS: process.env.STATISTICS_SECURE_FIELDS
    ? process.env.STATISTICS_SECURE_FIELDS.split(',')
    : ['createdBy', 'updatedBy'],

  // Public group id
  PUBLIC_GROUP_ID: process.env.PUBLIC_GROUP_ID || '10',
  // Private group ids will be excluded from results for non-admin users.
  PRIVATE_GROUP_IDS: JSON.parse(process.env.PRIVATE_GROUP_IDS || '["20000000"]')
}
