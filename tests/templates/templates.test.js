const templates = require('../../src/templates/emailTemplate');

describe('Email Templates', () => {
  describe('exports', () => {
    test('should export all expected templates', () => {
      const keys = Object.keys(templates);
      expect(keys.length).toBeGreaterThan(100);
    });

    test('each export should be a function', () => {
      Object.entries(templates).forEach(([name, fn]) => {
        expect(typeof fn).toBe('function');
      });
    });
  });

  describe('USER_CREATED template', () => {
    test('should return subject and html', () => {
      const result = templates.USER_CREATED({
        userId: 'u-123',
        username: 'John Doe',
        email: 'john@example.com',
        timestamp: new Date().toISOString()
      });

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result.subject).toContain('User Account');
      expect(result.html).toContain('John Doe');
    });
  });

  describe('PASSWORD_RESET_REQUESTED template', () => {
    test('should include reset URL', () => {
      const result = templates.PASSWORD_RESET_REQUESTED({
        username: 'Jane',
        resetToken: 'abc-123',
        resetUrl: 'https://example.com/reset?token=abc-123'
      });

      expect(result.html).toContain('https://example.com/reset?token=abc-123');
      expect(result.subject).toContain('Password');
    });
  });

  describe('CONTACT_NOTIFICATION template', () => {
    test('should render contact details', () => {
      const result = templates.CONTACT_NOTIFICATION({
        name: 'Alice',
        email: 'alice@example.com',
        phone: '555-1234',
        company: 'ACME Corp',
        subject: 'Help needed',
        message: 'I need assistance.',
        submittedAt: new Date().toISOString(),
        contactId: 'c-001'
      });

      expect(result.subject).toContain('Help needed');
      expect(result.html).toContain('Alice');
      expect(result.html).toContain('ACME Corp');
    });
  });

  describe('MAGIC_LINK template', () => {
    test('should render magic link URL', () => {
      const result = templates.MAGIC_LINK({
        username: 'Bob',
        magicUrl: 'https://app.example.com/magic?t=xyz',
        expiryMinutes: 10
      });

      expect(result.html).toContain('https://app.example.com/magic?t=xyz');
      expect(result.subject).toBeDefined();
    });
  });

  describe('ORDER_CREATED template', () => {
    test('should render order details', () => {
      const result = templates.ORDER_CREATED({
        username: 'Charlie',
        orderId: 'ORD-12345',
        orderDate: new Date().toISOString(),
        items: [{ name: 'Product A', quantity: 2, price: '$29.99' }],
        total: '$59.98',
        shippingAddress: '123 Main St'
      });

      expect(result.subject).toBeDefined();
      expect(result.html).toContain('ORD-12345');
    });
  });

  describe('template error handling', () => {
    test('USER_CREATED should handle missing optional fields gracefully', () => {
      const result = templates.USER_CREATED({
        userId: 'u-456',
        email: 'test@example.com',
        timestamp: new Date().toISOString()
      });

      expect(result.subject).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.html).toContain('User');
    });
  });
});
