/**
 * App constants
 */
const ADMIN_ROLES = ['administrator', 'admin']

const EVENT_ORIGINATOR = 'topcoder-member-api'

const EVENT_MIME_TYPE = 'application/json'

const TOPICS = {
  MemberUpdated: 'member.action.profile.update',
  EmailChanged: 'member.action.email.profile.emailchange.verification',
  MemberTraitCreated: 'member.action.profile.trait.create',
  MemberTraitUpdated: 'member.action.profile.trait.update',
  MemberTraitDeleted: 'member.action.profile.trait.delete'
}

const ES_SEARCH_MAX_SIZE = 9999

module.exports = {
  ADMIN_ROLES,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  TOPICS,
  ES_SEARCH_MAX_SIZE
}
