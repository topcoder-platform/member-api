/**
 * App constants
 */
const ADMIN_ROLES = ['administrator', 'admin']
const AUTOCOMPLETE_ROLES = ['copilot', 'administrator', 'admin', 'Connect Copilot', 'Connect Account Manager', 'Connect Admin', 'Account Executive']

const EVENT_ORIGINATOR = 'topcoder-member-api'

const EVENT_MIME_TYPE = 'application/json'

const TOPICS = {
  MemberCreated: 'member.action.profile.create',
  MemberUpdated: 'member.action.profile.update',
  EmailChanged: 'member.action.email.profile.emailchange.verification',
  MemberTraitCreated: 'member.action.profile.trait.create',
  MemberTraitUpdated: 'member.action.profile.trait.update',
  MemberTraitDeleted: 'member.action.profile.trait.delete',
  MemberSkillsCreated: 'member.action.profile.skills.create',
  MemberSkillsUpdated: 'member.action.profile.skills.update'
}

const ES_SEARCH_MAX_SIZE = 9999

const MAMBO_GET_REWARDS_ALLOWED_FIELDS = [
  'awarded.awardedType', 'awarded.message', 'awarded.name', 'awarded.type',
  'awarded.reward.active', 'awarded.reward.attrs', 'awarded.reward.id', 'awarded.reward.imageUrl', 'awarded.reward.mimeType', 'awarded.reward.hint', 'awarded.reward.message',
  'awardedOn', 'expiryOn', 'isExpired', 'id'
]

module.exports = {
  ADMIN_ROLES,
  AUTOCOMPLETE_ROLES,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  TOPICS,
  ES_SEARCH_MAX_SIZE,
  MAMBO_GET_REWARDS_ALLOWED_FIELDS
}
