/**
 * This module contains the looker api auth methods.
 * Code copy from https://github.com/topcoder-platform/onboarding-processor/src/common/LookerAuth
 */
const config = require('config')
const axios = require('axios')

const NEXT_5_MINS = 5 * 60 * 1000

/**
 * Create LookAuth instance
 * @param {Object} logger the logger object
 * @returns the LookAuth instance
 */
function LookAuth (logger) {
  // load credentials from config
  this.BASE_URL = config.LOOKER.API_BASE_URL
  this.CLIENT_ID = config.LOOKER.API_CLIENT_ID
  this.CLIENT_SECRET = config.LOOKER.API_CLIENT_SECRET
  const token = config.LOOKER.TOKEN

  this.logger = logger

  // Token is stringified and saved as string. It has 4 properties, access_token, expires_in and type, timestamp
  if (token) {
    this.lastToken = JSON.stringify(token)
  }
}

/**
 * Get access token
 * @returns access token
 */
LookAuth.prototype.getToken = async function () {
  const res = await new Promise((resolve) => {
    if (!this.isExpired()) {
      resolve(this.lastToken.access_token)
    } else {
      resolve('')
    }
  })
  if (res === '') {
    return this.login()
  }
  return res
}

/**
 * Login to get access token
 * @returns access token
 */
LookAuth.prototype.login = async function () {
  this.logger.debug('login to get access token')
  const loginUrl = `${this.BASE_URL}/login?client_id=${this.CLIENT_ID}&client_secret=${this.CLIENT_SECRET}`
  const res = await axios.post(loginUrl, {}, { headers: { 'Content-Type': 'application/json' } })
  this.lastToken = res.data
  this.lastToken.timestamp = new Date().getTime()
  return this.lastToken.access_token
}

/**
 * Check the token being expired or not
 * @returns true if the token is expired
 */
LookAuth.prototype.isExpired = function () {
  // If no token is present, assume the token has expired
  if (!this.lastToken) {
    return true
  }

  const tokenTimestamp = this.lastToken.timestamp
  const expiresIn = this.lastToken.expires_in
  const currentTimestamp = new Date().getTime()

  // If the token will good for next 5 minutes
  if ((tokenTimestamp + expiresIn + NEXT_5_MINS) > currentTimestamp) {
    return false
  }
  // Token is good, and can be used to make the next call.
  return true
}

module.exports = LookAuth
