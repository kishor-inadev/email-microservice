const { validateEmailPayload } = require('../../src/utils/validator');

describe('Validator', () => {
  describe('validateEmailPayload', () => {
    test('should validate correct email payload', () => {
      const payload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: { username: 'John Doe' }
      };

      const { error, value } = validateEmailPayload(payload);

      expect(error).toBeUndefined();
      expect(value.to).toBe('test@example.com');
      expect(value.templateId).toBe('USER_CREATED');
    });

    test('should validate array of email addresses', () => {
      const payload = {
        to: ['test1@example.com', 'test2@example.com'],
        templateId: 'USER_CREATED'
      };

      const { error, value } = validateEmailPayload(payload);

      expect(error).toBeUndefined();
      expect(value.to).toEqual(['test1@example.com', 'test2@example.com']);
    });

    test('should reject invalid email address', () => {
      const payload = {
        to: 'invalid-email',
        templateId: 'USER_CREATED'
      };

      const { error } = validateEmailPayload(payload);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be a valid email');
    });

    test('should reject missing required fields', () => {
      const payload = {
        to: 'test@example.com'
        // missing templateId or template
      };

      const { error } = validateEmailPayload(payload);

      expect(error).toBeDefined();
      expect(error.message).toContain('must contain at least one of [template, templateId]');
    });

    test('should validate optional fields', () => {
      const payload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: { username: 'John Doe' },
        idempotencyKey: 'test-key-123',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com']
      };

      const { error, value } = validateEmailPayload(payload);

      expect(error).toBeUndefined();
      expect(value.idempotencyKey).toBe('test-key-123');
      expect(value.cc).toBe('cc@example.com');
      expect(value.bcc).toEqual(['bcc1@example.com', 'bcc2@example.com']);
    });

    test('should support both template and templateId fields', () => {
      const payloadWithTemplate = {
        to: 'test@example.com',
        template: 'USER_CREATED'
      };

      const payloadWithTemplateId = {
        to: 'test@example.com',
        templateId: 'user-welcome-v2'
      };

      const { error: error1 } = validateEmailPayload(payloadWithTemplate);
      const { error: error2 } = validateEmailPayload(payloadWithTemplateId);

      expect(error1).toBeUndefined();
      expect(error2).toBeUndefined();
    });

    test('should validate templateId with hyphens and underscores', () => {
      const payload = {
        to: 'test@example.com',
        templateId: 'user-welcome_v2'
      };

      const { error, value } = validateEmailPayload(payload);

      expect(error).toBeUndefined();
      expect(value.templateId).toBe('user-welcome_v2');
    });

    test('should strip unknown fields', () => {
      const payload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        unknownField: 'should be removed'
      };

      const { error, value } = validateEmailPayload(payload);

      expect(error).toBeUndefined();
      expect(value.unknownField).toBeUndefined();
    });
  });
});