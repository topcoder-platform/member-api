/**
 * App bootstrap
 */
global.Promise = require('bluebird')
const Joi = require('joi')

Joi.page = () => Joi.number().integer().min(1).default(1)
Joi.perPage = () => Joi.number().integer().min(1).max(100).default(10)
Joi.sort = () => Joi.string().default("asc")