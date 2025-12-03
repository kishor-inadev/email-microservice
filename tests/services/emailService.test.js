const emailService = require('../../src/services/emailService');
const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn()
    };

    nodemailer.createTransporter.mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    test('should send email successfully with USER_CREATED template', async () => {
      // Mock successful email sending
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: []
      });

      const emailPayload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: {
          username: 'John Doe',
          email: 'test@example.com',
          companyName: 'Test Company'
        },
        requestId: 'test-request-id'
      };

      const result = await emailService.sendEmail(emailPayload);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('Welcome to Test Company'),
          html: expect.stringContaining('John Doe'),
          text: expect.any(String)
        })
      );
    });

    test('should handle template not found error', async () => {
      const emailPayload = {
        to: 'test@example.com',
        templateId: 'NON_EXISTENT_TEMPLATE',
        data: {},
        requestId: 'test-request-id'
      };

      await expect(emailService.sendEmail(emailPayload)).rejects.toThrow('Template not found');
    });

    test('should handle SMTP errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const emailPayload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: {
          username: 'John Doe',
          email: 'test@example.com'
        },
        requestId: 'test-request-id'
      };

      await expect(emailService.sendEmail(emailPayload)).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('renderTemplate', () => {
    test('should render USER_CREATED template correctly', async () => {
      const data = {
        username: 'John Doe',
        email: 'test@example.com',
        companyName: 'Test Company'
      };

      const rendered = await emailService.renderTemplate('USER_CREATED', data);

      expect(rendered.subject).toContain('Welcome to Test Company');
      expect(rendered.html).toContain('John Doe');
      expect(rendered.text).toContain('John Doe');
    });

    test('should render PASSWORD_RESET template correctly', async () => {
      const data = {
        username: 'John Doe',
        email: 'test@example.com',
        resetUrl: 'https://example.com/reset',
        companyName: 'Test Company'
      };

      const rendered = await emailService.renderTemplate('PASSWORD_RESET', data);

      expect(rendered.subject).toContain('Reset your Test Company password');
      expect(rendered.html).toContain('https://example.com/reset');
      expect(rendered.text).toContain('https://example.com/reset');
    });
  });

  describe('verifyConnection', () => {
    test('should verify connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await emailService.verifyConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    test('should handle connection failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await emailService.verifyConnection();

      expect(result).toBe(false);
    });
  });

  describe('sanitizeEmailForLog', () => {
    test('should sanitize single email address', () => {
      const sanitized = emailService.sanitizeEmailForLog('john.doe@example.com');
      expect(sanitized).toBe('jo***@example.com');
    });

    test('should sanitize array of email addresses', () => {
      const emails = ['john.doe@example.com', 'jane.doe@example.com'];
      const sanitized = emailService.sanitizeEmailForLog(emails);
      expect(sanitized).toEqual(['jo***@example.com', 'ja***@example.com']);
    });
  });
});
