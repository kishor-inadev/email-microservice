describe('Email Templates', () => {
  describe('USER_CREATED template', () => {
    test('should render with all required fields', () => {
      const template = require('../../src/templates/USER_CREATED');

      const data = {
        username: 'John Doe',
        email: 'john@example.com',
        activationUrl: 'https://example.com/activate',
        companyName: 'Test Company'
      };

      const result = template(data);

      expect(result.subject).toContain('Welcome to Test Company');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('https://example.com/activate');
      expect(result.text).toContain('John Doe');
      expect(result.text).toContain('https://example.com/activate');
    });

    test('should handle missing optional fields', () => {
      const template = require('../../src/templates/USER_CREATED');

      const data = {
        username: 'John Doe',
        email: 'john@example.com'
      };

      const result = template(data);

      expect(result.subject).toContain('Welcome to Company');
      expect(result.html).toContain('John Doe');
      expect(result.text).toContain('John Doe');
    });
  });

  describe('PASSWORD_RESET template', () => {
    test('should render with reset URL', () => {
      const template = require('../../src/templates/PASSWORD_RESET');

      const data = {
        username: 'John Doe',
        email: 'john@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
        companyName: 'Test Company'
      };

      const result = template(data);

      expect(result.subject).toContain('Reset your Test Company password');
      expect(result.html).toContain('https://example.com/reset?token=abc123');
      expect(result.text).toContain('https://example.com/reset?token=abc123');
    });
  });

  describe('ORDER_SUCCESS template', () => {
    test('should render with order details', () => {
      const template = require('../../src/templates/ORDER_SUCCESS');

      const data = {
        username: 'John Doe',
        email: 'john@example.com',
        orderNumber: 'ORD-12345',
        orderTotal: 99.99,
        currency: 'USD',
        items: [
          { name: 'Product 1', quantity: 2, price: 29.99 },
          { name: 'Product 2', quantity: 1, price: 39.99 }
        ],
        companyName: 'Test Company'
      };

      const result = template(data);

      expect(result.subject).toContain('Order Confirmation #ORD-12345');
      expect(result.html).toContain('ORD-12345');
      expect(result.html).toContain('$99.99');
      expect(result.html).toContain('Product 1');
      expect(result.html).toContain('Product 2');
    });
  });

  describe('CUSTOM_GENERIC_TEMPLATE template', () => {
    test('should render with custom content', () => {
      const template = require('../../src/templates/CUSTOM_GENERIC_TEMPLATE');

      const data = {
        username: 'John Doe',
        email: 'john@example.com',
        subject: 'Custom Subject',
        title: 'Custom Title',
        content: 'This is custom content.',
        ctaText: 'Click Here',
        ctaUrl: 'https://example.com',
        companyName: 'Test Company',
        theme: 'green'
      };

      const result = template(data);

      expect(result.subject).toBe('Custom Subject');
      expect(result.html).toContain('Custom Title');
      expect(result.html).toContain('This is custom content.');
      expect(result.html).toContain('Click Here');
      expect(result.html).toContain('https://example.com');
      expect(result.html).toContain('#16a34a'); // green theme color
    });
  });
});
