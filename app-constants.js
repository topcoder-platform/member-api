/**
 * App constants
 */
const ADMIN_ROLES = ['administrator', 'admin']

const EVENT_ORIGINATOR = 'topcoder-member-api'

const EVENT_MIME_TYPE = 'application/json'

const TOPICS = {
  MemberUpdated: 'member.action.profile.update',
  EmailChanged: 'member.action.email.profile.emailchange.verification'
}

module.exports = {
  ADMIN_ROLES,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  TOPICS
}
