// Mock nodemailer BEFORE importing emailService
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockTransporter = {
  sendMail: mockSendMail,
  verify: mockVerify
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter)
}));

// Mock google-auth-library to avoid requiring credentials
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
  }))
}));

// Set required env vars before import
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_PORT = '587';

const emailService = require('../../src/services/emailService');

describe('EmailService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    test('should send email successfully with USER_CREATED template', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: []
      });

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: {
          username: 'John Doe',
          email: 'test@example.com',
          userId: 'u-123',
          timestamp: new Date().toISOString()
        }
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.any(String),
          html: expect.stringContaining('John Doe')
        })
      );
    });

    test('should handle template not found error', async () => {
      await expect(emailService.sendEmail({
        to: 'test@example.com',
        templateId: 'NON_EXISTENT_TEMPLATE',
        data: {}
      })).rejects.toThrow('Template not found');
    });

    test('should handle SMTP errors', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      await expect(emailService.sendEmail({
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: {
          username: 'John Doe',
          email: 'test@example.com',
          userId: 'u-1',
          timestamp: new Date().toISOString()
        }
      })).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('renderTemplate', () => {
    test('should render USER_CREATED template correctly', () => {
      const rendered = emailService.renderTemplate('USER_CREATED', {
        username: 'John Doe',
        email: 'test@example.com',
        userId: 'u-1',
        timestamp: new Date().toISOString()
      });

      expect(rendered.subject).toBeDefined();
      expect(rendered.html).toContain('John Doe');
    });

    test('should render PASSWORD_RESET_REQUESTED template correctly', () => {
      const rendered = emailService.renderTemplate('PASSWORD_RESET_REQUESTED', {
        username: 'John Doe',
        email: 'test@example.com',
        resetUrl: 'https://example.com/reset',
        resetToken: 'abc-123'
      });

      expect(rendered.subject).toContain('Password');
      expect(rendered.html).toContain('https://example.com/reset');
    });
  });

  describe('verifyConnection', () => {
    test('should verify connection successfully', async () => {
      mockVerify.mockResolvedValue(true);

      const result = await emailService.verifyConnection();

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
    });

    test('should handle connection failure', async () => {
      mockVerify.mockRejectedValue(new Error('Connection failed'));

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

  describe('template pre-loading', () => {
    test('should have templates pre-loaded in cache', () => {
      expect(emailService.templateCache.size).toBeGreaterThan(100);
    });

    test('loadTemplate should be synchronous', () => {
      const template = emailService.loadTemplate('USER_CREATED');
      expect(typeof template).toBe('function');
    });
  });
});
