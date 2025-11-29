const Joi = require('joi');

// Email payload validation schema
const emailPayloadSchema = Joi.object({
  to: Joi.alternatives()
    .try(Joi.string().email().required(), Joi.array().items(Joi.string().email()).min(1).required())
    .required(),

  from: Joi.string().email().optional(),

  template: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(1)
    .max(100)
    .optional(),

  templateId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(1)
    .max(100)
    .optional(),

  data: Joi.object().optional().default({}),

  idempotencyKey: Joi.string().alphanum().min(1).max(255).optional(),

  cc: Joi.alternatives()
    .try(Joi.string().email(), Joi.array().items(Joi.string().email()))
    .optional(),

  bcc: Joi.alternatives()
    .try(Joi.string().email(), Joi.array().items(Joi.string().email()))
    .optional(),

  attachments: Joi.array()
    .items(
      Joi.object({
        filename: Joi.string().required(),
        content: Joi.alternatives().try(Joi.string(), Joi.binary()).required(),
        contentType: Joi.string().optional(),
        encoding: Joi.string().optional()
      })
    )
    .optional(),

  // Internal fields (added by service)
  requestId: Joi.string().optional(),
  timestamp: Joi.string().isoDate().optional(),
  retryCount: Joi.number().integer().min(0).optional()
}).or('template', 'templateId');

/**
 * Validate email payload
 */
function validateEmailPayload(payload) {
  return emailPayloadSchema.validate(payload, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });
}

/**
 * Kafka message validation schema
 */
const kafkaMessageSchema = Joi.object({
  to: Joi.alternatives()
    .try(Joi.string().email().required(), Joi.array().items(Joi.string().email()).min(1).required())
    .required(),

  from: Joi.string().email().optional(),

  template: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(1)
    .max(100)
    .optional(),

  templateId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(1)
    .max(100)
    .optional(),

  data: Joi.object().optional().default({}),

  idempotencyKey: Joi.string().alphanum().min(1).max(255).optional(),

  cc: Joi.alternatives()
    .try(Joi.string().email(), Joi.array().items(Joi.string().email()))
    .optional(),

  bcc: Joi.alternatives()
    .try(Joi.string().email(), Joi.array().items(Joi.string().email()))
    .optional(),

  attachments: Joi.array()
    .items(
      Joi.object({
        filename: Joi.string().required(),
        content: Joi.alternatives().try(Joi.string(), Joi.binary()).required(),
        contentType: Joi.string().optional(),
        encoding: Joi.string().optional()
      })
    )
    .optional(),

  requestId: Joi.string().required(),
  // timestamp: Joi.string().isoDate().required(),
  retryCount: Joi.number().integer().min(0).optional()
}).or('template', 'templateId');

/**
 * Validate Kafka message payload
 */
function validateKafkaMessage(payload) {
  return kafkaMessageSchema.validate(payload, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });
}

module.exports = {
  validateEmailPayload,
  validateKafkaMessage
};
