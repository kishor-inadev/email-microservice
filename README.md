# Email Microservice

A production-grade email sending microservice built with Node.js that integrates with other applications via Kafka and HTTP. Features include template rendering, retry mechanisms, idempotency support, and comprehensive observability.

## Features

- 🚀 **Kafka Integration**: Consume from `email.send` topic, publish to `email.success`/`email.failed` topics
- 🌐 **HTTP API**: REST endpoints for sending emails synchronously or asynchronously
- 📧 **Template System**: 294+ JavaScript-based email templates with dynamic content rendering
- 🎨 **Multi-App Branding**: Per-request app name, base URL, and CTA path via HTTP headers — one microservice, many frontend apps
- 🔄 **Retry Logic**: Configurable retry/backoff strategy with dead letter queue support
- 🛡️ **Idempotency**: Prevent duplicate email sending with configurable TTL
- 📊 **Observability**: Structured logging, metrics, and health checks
- 🔒 **Security**: Input validation, rate limiting, and secure credential handling
- 🐳 **Docker Ready**: Complete containerization with docker-compose for development
- ✅ **Production Ready**: PM2 support, proper error handling, and monitoring
- 🏢 **Multi-Tenant**: Per-request tenant resolution via `x-tenant-id` / `x-tanent` header
- 🛡️ **Graceful Degradation**: Service starts successfully even without SMTP credentials configured

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

3. **Start infrastructure (Kafka + MailHog):**
```bash
docker-compose up -d
```

4. **Start the email service:**
```bash
npm run dev
```

The service will be available at `http://localhost:3000`

### Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# View logs
tail -f logs/combined.log

# MailHog UI (captured emails during development)
open http://localhost:8025
```

## API Reference

### Request Headers

| Header | Description | Example |
|--------|-------------|---------|
| `x-app` | Override application name for email branding | `My Startup` |
| `x-app-url` | Override frontend base URL for all CTA and footer links | `https://myapp.com` |
| `x-path` | Override the primary CTA path (appended to base URL) | `/auth/verify-email` |
| `x-tenant-id` | Tenant identifier for multi-tenant setups | `acme-corp` |
| `x-tanent` | Alias for `x-tenant-id` (fallback) | `acme-corp` |

These headers let a single microservice instance serve multiple frontend applications. If omitted, `APP_URL`, `APPLICATION_NAME`, and `DEFAULT_TENANT_ID` env vars are used as defaults.

### Payload Structure

All email requests (HTTP and Kafka) use the same payload structure:

```json
{
  "to": "user@example.com",
  "from": "noreply@company.com",
  "templateId": "USER_CREATED",
  "data": {},
  "idempotencyKey": "optional-unique-key",
  "cc": "manager@company.com",
  "bcc": ["audit@company.com"],
  "attachments": []
}
```

**Note:** Either `template` or `templateId` must be provided. `templateId` takes precedence when both are given.

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string \| array | ✅ | Recipient email address(es) |
| `from` | string | ❌ | Sender email (uses `DEFAULT_FROM_EMAIL` if omitted) |
| `template` | string | ❌* | Template name (legacy support) |
| `templateId` | string | ❌* | Template ID (preferred) |
| `data` | object | ❌ | Data to pass to template for rendering |
| `idempotencyKey` | string | ❌ | Unique key (alphanumeric, hyphens, underscores) to prevent duplicate sends |
| `cc` | string \| array | ❌ | Carbon copy recipients |
| `bcc` | string \| array | ❌ | Blind carbon copy recipients |
| `attachments` | array | ❌ | File attachments |

*Either `template` or `templateId` is required.

### Attachment Format

```json
{
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content": "<base64-encoded-content>",
      "contentType": "application/pdf",
      "encoding": "base64"
    }
  ]
}
```

## Multi-App Branding

This microservice is designed to be shared by multiple frontend applications. Each caller controls branding via request headers:

```bash
# App A: send a welcome email branded for "Acme"
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -H "x-app: Acme Corp" \
  -H "x-app-url: https://acme.com" \
  -H "x-path: /welcome" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": { "username": "Jane" }
  }'

# App B: same microservice, different branding
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -H "x-app: Beta Platform" \
  -H "x-app-url: https://betaplatform.io" \
  -H "x-path: /auth/welcome" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": { "username": "Jane" }
  }'
```

### CTA URL priority (highest wins)

| Level | How to set | Example |
|-------|-----------|---------|
| `data.ctaUrl` | Full URL in payload `data` | `"ctaUrl": "https://acme.com/verify?token=abc"` |
| `x-path` header | Path appended to base URL | `x-path: /auth/verify` → `https://acme.com/auth/verify` |
| Template default | Built-in sensible path per template | `/login`, `/dashboard`, `/billing`, etc. |

**For Kafka messages** (no HTTP headers), embed equivalent fields in `data`:

```json
{
  "data": {
    "appUrl": "https://myapp.com",
    "applicationName": "My App",
    "ctaPath": "/auth/verify-email",
    "ctaUrl": "https://myapp.com/auth/verify-email?token=abc"
  }
}
```

## Integration Guide

### Method 1: Kafka Integration (Recommended)

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'your-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();
await producer.connect();

// Example: password reset email
await producer.send({
  topic: 'email.send',
  messages: [{
    value: JSON.stringify({
      to: user.email,
      templateId: 'PASSWORD_RESET_REQUESTED',
      data: {
        username: user.name,
        resetToken: token,
        expiryHours: 1,
        // Per-app branding (Kafka equivalent of HTTP headers)
        appUrl: 'https://app.com',
        applicationName: 'My App',
        ctaPath: `/reset?token=${token}`
      },
      idempotencyKey: `password-reset-${user.id}-${Date.now()}`
    })
  }]
});
```

#### Listening for results

```javascript
const consumer = kafka.consumer({ groupId: 'your-app-email-results' });
await consumer.subscribe({ topics: ['email.success', 'email.failed'] });

await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const payload = JSON.parse(message.value.toString());
    if (topic === 'email.success') {
      console.log('Sent:', payload.result.messageId);
    } else {
      console.error('Failed:', payload.error.message, '— retries:', payload.retryCount);
    }
  }
});
```

### Method 2: HTTP Integration

#### Asynchronous (queued via Kafka when `ENABLE_KAFKA=true`)

```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -H "x-app: Acme Corp" \
  -H "x-app-url: https://acme.com" \
  -H "x-path: /auth/reset-password" \
  -d '{
    "to": "user@example.com",
    "templateId": "PASSWORD_RESET_REQUESTED",
    "data": {
      "username": "John Doe",
      "resetToken": "abc123",
      "expiryHours": 1
    },
    "idempotencyKey": "reset-user-123"
  }'
```

#### Synchronous (immediate send, waits for SMTP response)

```bash
curl -X POST http://localhost:3000/send-email/sync \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "templateId": "EMAIL_VERIFIED",
    "data": { "username": "Jane" }
  }'
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `http://localhost:3000` | Default frontend base URL used in all email links |
| `FRONTEND_URL` | `http://localhost:3001` | Alternative frontend URL (fallback for `APP_URL`) |
| `APPLICATION_NAME` | `Your Company` | Default app/brand name shown in email footers |
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `DEFAULT_FROM_EMAIL` | — | Default sender email address |
| `DEFAULT_FROM_NAME` | — | Default sender display name |
| `ENABLE_KAFKA` | `false` | Enable Kafka consumer/producer |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker list |
| `MONGODB_URI` | — | MongoDB connection string |
| `TENANCY_ENABLED` | `false` | Enable multi-tenant mode |
| `DEFAULT_TENANT_ID` | `null` | Default tenant when header is absent |

## Available Templates

The service includes 294+ templates across the following categories:

| Category | Example Templates |
|----------|------------------|
| User Management | `USER_CREATED`, `USER_WELCOME`, `USER_SUSPENDED`, `USER_REINSTATED` |
| Authentication | `PASSWORD_RESET_REQUESTED`, `EMAIL_VERIFIED`, `MFA_ENABLED`, `ACCOUNT_LOCKED` |
| Security | `LOGIN_FAILED`, `NEW_DEVICE_LOGIN`, `SOCIAL_LOGIN_CONNECTED`, `SESSION_EXPIRED` |
| Organization | `ORG_CREATED`, `ORG_MEMBER_INVITED`, `ORG_ROLE_ASSIGNED`, `ORG_BILLING_UPDATED` |
| Payments / Billing | `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `INVOICE_GENERATED`, `SUBSCRIPTION_RENEWED` |
| E-commerce / Orders | `ORDER_CREATED`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `RETURN_APPROVED` |
| Shipping | `PACKAGE_DISPATCHED`, `PACKAGE_IN_TRANSIT`, `PACKAGE_DELIVERED`, `PACKAGE_LOST` |
| Promotions | `PROMOTION_LAUNCHED`, `FLASH_SALE_ANNOUNCEMENT`, `LOYALTY_POINTS_EARNED` |
| Admin / System | `SYSTEM_ALERT`, `DEPLOYMENT_COMPLETED`, `DATA_BACKUP_COMPLETED` |
| Marketplace | `MARKETPLACE_NEW_REQUEST`, `MARKETPLACE_JOB_ASSIGNED`, `MARKETPLACE_PAYMENT_RECEIVED` |

For the complete list see `src/templates/emailTemplate.js`.

## Development

### Testing

```bash
npm test                          # run all tests
npx jest tests/templates/         # template rendering tests
npx jest tests/utils/             # validator tests
npx jest tests/services/          # service unit tests
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Docker (development)

```bash
docker-compose up          # starts MongoDB + MailHog + email service
```

## Production Deployment

```bash
# Using PM2
pm2 start ecosystem.config.js --env production

# Using Docker
docker-compose -f docker-compose.prod.yml up -d
```

## License

MIT

