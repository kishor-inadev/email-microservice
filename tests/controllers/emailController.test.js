const request = require('supertest');
const express = require('express');
const emailController = require('../../src/controllers/emailController');

// Mock dependencies
jest.mock('../../src/services/emailService');
jest.mock('../../src/kafka/producer');
jest.mock('../../src/utils/idempotency');

const emailService = require('../../src/services/emailService');
const { publishToKafka } = require('../../src/kafka/producer');
const idempotency = require('../../src/utils/idempotency');

describe('EmailController', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.requestId = 'test-request-id';
      next();
    });
    app.post('/send-email', emailController.sendEmail);
    app.post('/send-email/sync', emailController.sendEmailSync);
    app.get('/metrics', emailController.getMetrics);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /send-email', () => {
    test('should queue email successfully', async () => {
      publishToKafka.mockResolvedValue(true);
      idempotency.checkDuplicate.mockResolvedValue(false);
      idempotency.markAsProcessed.mockResolvedValue();

      const payload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: { username: 'John Doe' }
      };

      const response = await request(app)
        .post('/send-email')
        .send(payload)
        .expect(202);

      expect(response.body.message).toBe('Email queued for processing');
      expect(response.body.requestId).toBe('test-request-id');
      expect(publishToKafka).toHaveBeenCalled();
    });

    test('should handle validation errors', async () => {
      const payload = {
        to: 'invalid-email',
        templateId: 'USER_CREATED'
      };

      const response = await request(app)
        .post('/send-email')
        .send(payload)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('should handle duplicate requests with idempotency key', async () => {
      idempotency.checkDuplicate.mockResolvedValue(true);

      const payload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: { username: 'John Doe' },
        idempotencyKey: 'test-key'
      };

      const response = await request(app)
        .post('/send-email')
        .send(payload)
        .expect(202);

      expect(response.body.message).toBe('Email already processed');
      expect(publishToKafka).not.toHaveBeenCalled();
    });
  });

  describe('POST /send-email/sync', () => {
    test('should send email synchronously', async () => {
      emailService.sendEmail.mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: []
      });
      idempotency.checkDuplicate.mockResolvedValue(false);
      idempotency.markAsProcessed.mockResolvedValue();

      const payload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: { username: 'John Doe' }
      };

      const response = await request(app)
        .post('/send-email/sync')
        .send(payload)
        .expect(200);

      expect(response.body.message).toBe('Email sent successfully');
      expect(response.body.messageId).toBe('test-message-id');
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    test('should handle email sending errors', async () => {
      emailService.sendEmail.mockRejectedValue(new Error('SMTP error'));
      idempotency.checkDuplicate.mockResolvedValue(false);
      idempotency.markAsProcessed.mockResolvedValue();

      const payload = {
        to: 'test@example.com',
        templateId: 'USER_CREATED',
        data: { username: 'John Doe' }
      };

      const response = await request(app)
        .post('/send-email/sync')
        .send(payload)
        .expect(500);

      expect(response.body.error).toBe('Failed to send email');
      expect(response.body.message).toBe('SMTP error');
    });
  });

  describe('GET /metrics', () => {
    test('should return metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body.metrics).toHaveProperty('emails_sent_total');
      expect(response.body.metrics).toHaveProperty('emails_failed_total');
      expect(response.body.metrics).toHaveProperty('emails_processed_total');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});