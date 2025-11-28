# Email Microservice

A production-grade email sending microservice built with Node.js that integrates with other applications via Kafka and HTTP. Features include template rendering, retry mechanisms, idempotency support, and comprehensive observability.

## Features

- 🚀 **Kafka Integration**: Consume from `email.send` topic, publish to `email.success`/`email.failed` topics
- 🌐 **HTTP API**: REST endpoints for sending emails synchronously or asynchronously
- 📧 **Template System**: JavaScript-based email templates with dynamic content rendering
- 🔄 **Retry Logic**: Configurable retry/backoff strategy with dead letter queue support
- 🛡️ **Idempotency**: Prevent duplicate email sending with configurable TTL
- 📊 **Observability**: Structured logging, metrics, and health checks
- 🔒 **Security**: Input validation, rate limiting, and secure credential handling
- 🐳 **Docker Ready**: Complete containerization with docker-compose for development
- ✅ **Production Ready**: PM2 support, proper error handling, and monitoring

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for Kafka and MailHog)
- Git

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd email-microservice
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure (Kafka + MailHog + Redis):**
```bash
docker-compose up -d
```

4. **Start the email service:**
```bash
npm run dev
```

The service will be available at `http://localhost:3000`

### Verify Installation

1. **Check health:**
```bash
curl http://localhost:3000/health
```

2. **View logs:**
```bash
tail -f logs/combined.log
```

3. **Access MailHog UI (for testing emails):**
Open `http://localhost:8025` in your browser

## API Reference

### Payload Structure

All email requests (both HTTP and Kafka) use the same payload structure:

```javascript
{
  "to": "user@example.com",                    // Required: recipient email(s)
  "from": "noreply@company.com",               // Optional: sender email
  "template": "USER_CREATED",                  // Optional: template name (legacy)
  "templateId": "user-welcome-v2",             // Optional: template ID (preferred)
  "data": { ... },                             // Optional: template data
  "idempotencyKey": "optional-unique-key",     // Optional: prevent duplicates
  "cc": "manager@company.com",                 // Optional: CC recipients
  "bcc": ["audit@company.com"],                // Optional: BCC recipients
  "attachments": [...]                         // Optional: file attachments
}
```

**Note:** Either `template` or `templateId` must be provided. If both are provided, `templateId` takes precedence.

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string or array | ✅ | Recipient email address(es) |
| `from` | string | ❌ | Sender email (uses default if not provided) |
| `template` | string | ❌* | Template name (legacy support) |
| `templateId` | string | ❌* | Template ID (preferred, supports versioning) |
| `data` | object | ❌ | Data to pass to template for rendering |
| `idempotencyKey` | string | ❌ | Unique key to prevent duplicate sends |
| `cc` | string or array | ❌ | Carbon copy recipients |
| `bcc` | string or array | ❌ | Blind carbon copy recipients |
| `attachments` | array | ❌ | File attachments (see attachment format below) |

*Either `template` or `templateId` is required.

### Attachment Format

```javascript
{
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content": "base64-encoded-content-or-buffer",
      "contentType": "application/pdf",
      "encoding": "base64"
    }
  ]
}
```

## Integration Guide

### Method 1: Kafka Integration (Recommended)

Kafka integration provides better decoupling, reliability, and scalability.

#### Basic Kafka Producer Setup

```javascript
const { Kafka } = require('kafkajs');

// Initialize Kafka client
const kafka = new Kafka({ 
  clientId: 'your-service-name', 
  brokers: ['localhost:9092'] 
});

const producer = kafka.producer();
await producer.connect();
```

#### Example 1: User Welcome Email

```javascript
async function sendWelcomeEmail(user) {
  await producer.send({
    topic: 'email.send',
    messages: [{
      key: user.id, // Optional: for message ordering
      value: JSON.stringify({
        to: user.email,
        from: 'noreply@company.com',
        templateId: 'user-welcome-v2',  // Use templateId for better organization
        data: { 
          username: user.name,
          email: user.email,
          activationUrl: `https://app.com/activate?token=${user.activationToken}`
        },
        idempotencyKey: `user-${user.id}-welcome`
      })
    }]
  });
}
```

#### Example 2: Password Reset Email

```javascript
async function sendPasswordReset(user, resetToken) {
  await producer.send({
    topic: 'email.send',
    messages: [{
      value: JSON.stringify({
        to: user.email,
        templateId: 'password-reset-v1',
        data: {
          username: user.name,
          email: user.email,
          resetUrl: `https://app.com/reset?token=${resetToken}`,
          expiryTime: '1 hour',
          companyName: 'Your Company'
        },
        idempotencyKey: `password-reset-${user.id}-${Date.now()}`
      })
    }]
  });
}
```

#### Example 3: Order Confirmation Email

```javascript
async function sendOrderConfirmation(order) {
  await producer.send({
    topic: 'email.send',
    messages: [{
      value: JSON.stringify({
        to: order.customerEmail,
        templateId: 'order-success-v1',
        data: {
          username: order.customerName,
          email: order.customerEmail,
          orderNumber: order.id,
          orderTotal: order.total,
          currency: order.currency,
          items: order.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price
          })),
          shippingAddress: order.shippingAddress,
          estimatedDelivery: order.estimatedDelivery,
          trackingUrl: order.trackingUrl,
          companyName: 'Your Company'
        },
        idempotencyKey: `order-${order.id}-confirmation`
      })
    }]
  });
}
```

#### Example 4: Custom Email with Attachments

```javascript
async function sendCustomEmailWithAttachment(recipient, attachmentData) {
  await producer.send({
    topic: 'email.send',
    messages: [{
      value: JSON.stringify({
        to: recipient.email,
        cc: ['manager@company.com'],
        bcc: ['audit@company.com'],
        templateId: 'custom-message-v1',
        data: {
          username: recipient.name,
          email: recipient.email,
          subject: 'Your Monthly Report',
          title: 'Monthly Performance Report',
          content: 'Please find your monthly performance report attached.',
          ctaText: 'View Dashboard',
          ctaUrl: 'https://app.com/dashboard',
          theme: 'blue',
          companyName: 'Your Company'
        },
        attachments: [{
          filename: 'monthly-report.pdf',
          content: attachmentData.toString('base64'),
          contentType: 'application/pdf',
          encoding: 'base64'
        }],
        idempotencyKey: `report-${recipient.id}-${new Date().getMonth()}`
      })
    }]
  });
}
```

#### Listening for Email Results

```javascript
const consumer = kafka.consumer({ groupId: 'your-app-email-results' });

await consumer.subscribe({ topics: ['email.success', 'email.failed'] });

await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const payload = JSON.parse(message.value.toString());
    
    if (topic === 'email.success') {
      console.log('Email sent successfully:', {
        messageId: payload.result.messageId,
        to: payload.originalMessage.to,
        template: payload.originalMessage.templateId || payload.originalMessage.template
      });
      // Update database, send notification, etc.
    } else if (topic === 'email.failed') {
      console.error('Email failed:', {
        error: payload.error.message,
        to: payload.originalMessage.to,
        retryCount: payload.retryCount
      });
      // Handle failure, retry, alert, etc.
    }
  }
});
```

### Method 2: HTTP Integration

Direct HTTP integration for simpler use cases or synchronous operations.

#### Asynchronous Email (Queued via Kafka)

```bash
# Example 1: User Welcome Email
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "user-welcome-v2",
    "data": {
      "username": "John Doe",
      "email": "user@example.com",
      "activationUrl": "https://app.com/activate?token=abc123",
      "companyName": "Acme Corp"
    },
    "idempotencyKey": "user-123-welcome"
  }'

# Example 2: Password Reset Email
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "password-reset-v1",
    "data": {
      "username": "John Doe",
      "email": "user@example.com",
      "resetUrl": "https://app.com/reset?token=xyz789",
      "expiryTime": "1 hour",
      "companyName": "Acme Corp"
    },
    "idempotencyKey": "reset-123-456"
  }'

# Example 3: Order Confirmation
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "customer@example.com",
    "templateId": "order-success-v1",
    "data": {
      "username": "Jane Smith",
      "email": "customer@example.com",
      "orderNumber": "ORD-12345",
      "orderTotal": 99.99,
      "currency": "USD",
      "items": [
        {"name": "Product A", "quantity": 2, "price": 29.99},
        {"name": "Product B", "quantity": 1, "price": 39.99}
      ],
      "companyName": "Acme Corp"
    },
    "idempotencyKey": "order-12345-confirmation"
  }'

# Example 4: Custom Email with CC/BCC
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "cc": ["manager@company.com"],
    "bcc": ["audit@company.com"],
    "templateId": "custom-message-v1",
    "data": {
      "username": "John Doe",
      "email": "recipient@example.com",
      "subject": "Important Update",
      "title": "System Maintenance Notice",
      "content": "We will be performing system maintenance on Sunday...",
      "ctaText": "View Details",
      "ctaUrl": "https://app.com/maintenance",
      "theme": "orange",
      "companyName": "Acme Corp"
    },
    "idempotencyKey": "maintenance-notice-2024-01"
  }'
```

#### JavaScript/Node.js Examples

```javascript
// Example 1: Simple email sending function
async function sendEmail(emailData) {
  const response = await fetch('http://localhost:3000/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: emailData.to,
      templateId: emailData.templateId,  // Use templateId for better versioning
      data: emailData.data,
      idempotencyKey: emailData.idempotencyKey
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('Email queued:', result.requestId);
    return result;
  } else {
    const error = await response.json();
    console.error('Failed to send email:', error);
    throw new Error(error.message);
  }
}

// Example 2: Welcome email with error handling
async function sendWelcomeEmail(user) {
  try {
    const result = await sendEmail({
      to: user.email,
      templateId: 'user-welcome-v2',
      data: {
        username: user.name,
        email: user.email,
        activationUrl: `https://app.com/activate?token=${user.activationToken}`,
        companyName: 'Your Company'
      },
      idempotencyKey: `user-${user.id}-welcome`
    });
    
    console.log(`Welcome email queued for ${user.email}:`, result.requestId);
    return result;
  } catch (error) {
    console.error(`Failed to send welcome email to ${user.email}:`, error.message);
    throw error;
  }
}

// Example 3: Bulk email sending
async function sendBulkEmails(recipients, templateId, commonData) {
  const promises = recipients.map(recipient => 
    sendEmail({
      to: recipient.email,
      templateId,
      data: {
        ...commonData,
        username: recipient.name,
        email: recipient.email
      },
      idempotencyKey: `bulk-${templateId}-${recipient.id}-${Date.now()}`
    })
  );
  
  const results = await Promise.allSettled(promises);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Bulk email results: ${successful} successful, ${failed} failed`);
  return results;
}
```

#### Synchronous Email (Direct Send)

```bash
# For testing or immediate sending
curl -X POST http://localhost:3000/send-email/sync \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "templateId": "password-reset-v1",
    "data": {
      "username": "John Doe",
      "email": "test@example.com",
      "resetUrl": "https://app.com/reset?token=abc123",
      "expiryTime": "1 hour",
      "companyName": "Test Company"
    }
  }'
```

## Email Templates

### Template Structure

Templates are JavaScript modules that export a render function:

```javascript
// src/templates/YOUR_TEMPLATE.js
module.exports = function render(data) {
  const { username, companyName = 'Company' } = data;
  
  const subject = `Hello ${username}!`;
  
  const html = `
    <html>
      <body>
        <h1>Welcome ${username}</h1>
        <p>Thank you for joining ${companyName}!</p>
      </body>
    </html>
  `;
  
  const text = `
    Welcome ${username}
    Thank you for joining ${companyName}!
  `;
  
  return { subject, html, text };
};
```

### Built-in Templates

The service includes these ready-to-use templates. You can reference them using either `template` (legacy) or `templateId` (preferred):

#### 1. USER_CREATED
Welcome email for new user registrations.

**Template ID:** `USER_CREATED` or `user-welcome`

**Required data:**
- `username`: User's display name
- `email`: User's email address

**Optional data:**
- `activationUrl`: Account activation link
- `companyName`: Your company name (default: "Company")

**Example:**

```javascript
{
  "templateId": "USER_CREATED",  // or "user-welcome"
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "activationUrl": "https://app.com/activate?token=abc123",
    "companyName": "Acme Corp"
  }
}
```

#### 2. PASSWORD_RESET
Password reset email with secure reset link.

**Template ID:** `PASSWORD_RESET` or `password-reset`

**Required data:**
- `username`: User's display name
- `email`: User's email address
- `resetUrl`: Password reset link

**Optional data:**
- `expiryTime`: Link expiration time (default: "1 hour")
- `companyName`: Your company name (default: "Company")

**Example:**

```javascript
{
  "templateId": "PASSWORD_RESET",  // or "password-reset"
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "resetUrl": "https://app.com/reset?token=xyz789",
    "expiryTime": "2 hours",
    "companyName": "Acme Corp"
  }
}
```

#### 3. ORDER_SUCCESS
Order confirmation email with detailed order information.

**Template ID:** `ORDER_SUCCESS` or `order-confirmation`

**Required data:**
- `username`: Customer's name
- `email`: Customer's email
- `orderNumber`: Unique order identifier
- `orderTotal`: Total order value
- `currency`: Currency code (default: "USD")

**Optional data:**
- `items`: Array of ordered items
- `shippingAddress`: Delivery address object
- `estimatedDelivery`: Delivery date
- `trackingUrl`: Order tracking link
- `companyName`: Your company name (default: "Company")

**Example:**

```javascript
{
  "templateId": "ORDER_SUCCESS",  // or "order-confirmation"
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "orderNumber": "ORD-12345",
    "orderTotal": 109.97,
    "currency": "USD",
    "items": [
      { "name": "Product A", "quantity": 2, "price": 29.99 },
      { "name": "Product B", "quantity": 1, "price": 49.99 }
    ],
    "shippingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zip": "12345",
      "country": "USA"
    },
    "estimatedDelivery": "January 25, 2024",
    "trackingUrl": "https://shipping.com/track/ABC123",
    "companyName": "Acme Corp"
  }
}
```

#### 4. CUSTOM_GENERIC_TEMPLATE
Flexible template for custom content with theming support.

**Template ID:** `CUSTOM_GENERIC_TEMPLATE` or `custom-message`

**Required data:**
- `subject`: Email subject line
- `content`: Main email content

**Optional data:**
- `username`: Recipient's name
- `email`: Recipient's email
- `title`: Email title/heading
- `theme`: Color theme ('blue', 'green', 'red', 'purple', 'orange')
- `ctaText`: Call-to-action button text
- `ctaUrl`: Call-to-action button URL
- `footerText`: Custom footer text
- `companyName`: Your company name (default: "Company")

**Example:**

```javascript
{
  "templateId": "CUSTOM_GENERIC_TEMPLATE",  // or "custom-message"
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "subject": "Important Update",
    "title": "System Maintenance Notice",
    "content": "We will be performing scheduled maintenance on our systems this Sunday from 2 AM to 6 AM EST. During this time, some services may be temporarily unavailable.",
    "theme": "orange",
    "ctaText": "View Maintenance Schedule",
    "ctaUrl": "https://app.com/maintenance",
    "footerText": "Thank you for your patience during this maintenance window.",
    "companyName": "Acme Corp"
  }
}
```

### Template ID vs Template Name

The service supports both `template` and `templateId` fields for backward compatibility:

- **`templateId`** (preferred): More flexible naming, supports versioning (e.g., `user-welcome-v2`)
- **`template`** (legacy): Original field name, still supported

If both are provided, `templateId` takes precedence. This allows for:
- Better template organization and versioning
- More descriptive template names
- Easier A/B testing with different template versions
- Cleaner separation between template files and logical template IDs

### Adding Custom Templates

1. **Create a new template file:**
```javascript
// src/templates/CUSTOM_TEMPLATE.js
module.exports = function render(data) {
  const { username, customData, companyName = 'Company' } = data;
  
  return {
    subject: `Custom Subject for ${username}`,
    html: `<html><body><h1>Custom HTML content</h1></body></html>`,
    text: `Custom text content for ${username}`
  };
};
```

2. **Use the template:**
```javascript
{
  "templateId": "CUSTOM_TEMPLATE",
  "data": {
    "username": "John",
    "customData": "some value"
  }
}
```

## Kafka Message Formats

### Success Message Format

Published to `email.success` topic when email is sent successfully:

```javascript
{
  "originalMessage": {
    "to": "user@example.com",
    "templateId": "user-welcome-v2",
    "data": { ... },
    "requestId": "req-123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "result": {
    "messageId": "<email-message-id@smtp.server>",
    "accepted": ["user@example.com"],
    "rejected": []
  },
  "status": "success",
  "timestamp": "2024-01-15T10:30:05.000Z",
  "processedAt": "2024-01-15T10:30:05.000Z"
}
```

### Failure Message Format

Published to `email.failed` topic when email sending fails:

```javascript
{
  "originalMessage": {
    "to": "user@example.com",
    "templateId": "user-welcome-v2",
    "data": { ... },
    "requestId": "req-123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "error": {
    "message": "SMTP connection failed",
    "code": "ECONNREFUSED"
  },
  "status": "failed",
  "retryCount": 3,
  "timestamp": "2024-01-15T10:30:15.000Z",
  "failedAt": "2024-01-15T10:30:15.000Z"
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=email-microservice
KAFKA_GROUP_ID=email-service-group

# Email Configuration (SMTP)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
DEFAULT_FROM_EMAIL=noreply@company.com
DEFAULT_FROM_NAME=Company Name
```

### Optional Environment Variables

```bash
# Kafka Topics (with defaults)
KAFKA_TOPIC_SEND=email.send
KAFKA_TOPIC_SUCCESS=email.success
KAFKA_TOPIC_FAILED=email.failed

# SMTP Authentication (if required)
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Email Service Configuration
EMAIL_RETRY_LIMIT=3
EMAIL_RETRY_BACKOFF_MS=5000
TEMPLATE_DIR=src/templates
ENABLE_SYNC_ENDPOINT=true

# Idempotency Configuration
IDEMPOTENCY_TTL_MS=3600000
IDEMPOTENCY_CLEANUP_INTERVAL_MS=300000

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (for production idempotency)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Logging
LOG_LEVEL=info
```

## Idempotency

The service supports idempotency to prevent duplicate email sending:

### How It Works

1. Include an `idempotencyKey` in your email payload
2. The service stores processed keys with TTL
3. Duplicate requests with the same key are ignored
4. Keys expire after the configured TTL (default: 1 hour)

### Example Usage

```javascript
// First request - email will be sent
{
  "to": "user@example.com",
  "templateId": "user-welcome",
  "data": { "username": "John" },
  "idempotencyKey": "user-123-welcome"
}

// Duplicate request - email will NOT be sent again
{
  "to": "user@example.com",
  "templateId": "user-welcome",
  "data": { "username": "John" },
  "idempotencyKey": "user-123-welcome"  // Same key
}
```

### Production Setup with Redis

For production environments, replace the in-memory idempotency store with Redis:

1. **Set Redis environment variables:**
```bash
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-redis-password
```

2. **Uncomment Redis implementation in `src/utils/idempotency.js`**

3. **Install Redis client:**
```bash
npm install redis
```

## Monitoring and Observability

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```javascript
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0"
}
```

### Metrics

```bash
curl http://localhost:3000/metrics
```

Response:
```javascript
{
  "metrics": {
    "emails_sent_total": 150,
    "emails_failed_total": 5,
    "emails_retried_total": 12,
    "emails_processed_total": 155,
    "service_uptime_ms": 3600000,
    "service_uptime_seconds": 3600
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Structured Logging

All logs are structured JSON with correlation IDs:

```javascript
{
  "level": "info",
  "message": "Email sent successfully",
  "requestId": "req-123",
  "messageId": "<email-id@smtp.server>",
  "to": "us***@example.com",
  "template": "user-welcome-v2",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "email-microservice"
}
```

## Deployment

### Docker Deployment

1. **Build the image:**
```bash
docker build -t email-microservice .
```

2. **Run with docker-compose:**
```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up
```

### Production Deployment

1. **Using PM2:**
```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

2. **Environment variables:**
```bash
# Use a secrets manager in production
export SMTP_PASS=$(aws secretsmanager get-secret-value --secret-id smtp-password --query SecretString --output text)
export REDIS_PASSWORD=$(vault kv get -field=password secret/redis)
```

3. **Health checks:**
```bash
# Add to your load balancer
curl -f http://localhost:3000/health || exit 1
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start test environment
docker-compose up -d

# Run integration tests
npm run test:integration
```

### Manual Testing

1. **Send test email:**
```bash
curl -X POST http://localhost:3000/send-email/sync \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "templateId": "user-welcome-v2",
    "data": {"username": "Test User"}
  }'
```

2. **Check MailHog UI:**
Open `http://localhost:8025` to see sent emails

## Security Considerations

### Data Privacy

- Email addresses are sanitized in logs (`us***@example.com`)
- Sensitive template data is redacted from logs
- SMTP credentials are never logged

### Input Validation

- All payloads are validated with Joi schemas
- Email addresses are validated for format
- Template names are restricted to alphanumeric + hyphens/underscores

### Rate Limiting

- HTTP endpoints have configurable rate limits
- Default: 100 requests per 15 minutes per IP

### GDPR Compliance

- No email content is stored permanently
- Logs can be configured with retention policies
- Idempotency keys expire automatically

## Troubleshooting

### Common Issues

1. **Kafka connection failed:**
   - Check `KAFKA_BROKERS` environment variable
   - Ensure Kafka is running: `docker-compose ps`

2. **SMTP errors:**
   - Verify SMTP configuration in `.env`
   - Check MailHog is running: `curl http://localhost:8025`

3. **Template not found:**
   - Ensure template file exists in `src/templates/`
   - Check template name matches exactly (case-sensitive)

4. **Validation errors:**
   - Check payload structure matches API documentation
   - Ensure required fields are provided

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Logs Location

- Combined logs: `logs/combined.log`
- Error logs: `logs/error.log`
- PM2 logs: `logs/pm2-*.log`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Run linting: `npm run lint`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.