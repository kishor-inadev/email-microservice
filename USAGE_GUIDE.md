# Email Microservice — Usage Guide

## Overview

This email microservice supports two operating modes:

1. **HTTP-only mode** (default, `ENABLE_KAFKA=false`) — Direct email sending via HTTP API
2. **Kafka mode** (`ENABLE_KAFKA=true`) — Message queue-based email sending

Both modes log all emails to MongoDB. The service is multi-app capable: a single deployment can send branded emails on behalf of multiple frontend applications using per-request HTTP headers.

---

## Configuration

### Environment Variables

```bash
# ── App / Branding ──────────────────────────────────────────
APP_URL=http://localhost:3000          # Default base URL for all email links
FRONTEND_URL=http://localhost:3001     # Alt frontend URL (fallback for APP_URL)
APPLICATION_NAME=Your Company          # Default app name shown in email footers

# ── SMTP ────────────────────────────────────────────────────
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourcompany.com
DEFAULT_FROM_NAME=Your Company

# ── MongoDB ─────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/email-service
MONGODB_DB_NAME=email-service

# ── Kafka (optional) ────────────────────────────────────────
ENABLE_KAFKA=false
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=email-service-group
KAFKA_TOPIC_EMAIL_SEND=email.send
KAFKA_TOPIC_EMAIL_SUCCESS=email.success
KAFKA_TOPIC_EMAIL_FAILED=email.failed

# ── Multi-tenancy (optional) ─────────────────────────────────
TENANCY_ENABLED=false
DEFAULT_TENANT_ID=
```

---

## Per-Request App Context (Multi-App Support)

Because this is a shared microservice, the calling application can override branding and CTA links on every request without changing any configuration.

### HTTP Headers

| Header | Sets | Fallback |
|--------|------|----------|
| `x-app` | Application name in email footer | `APPLICATION_NAME` env var |
| `x-app-url` | Base URL for all CTA and footer links | `APP_URL` env var |
| `x-path` | Path segment appended to base URL for primary CTA | `null` (template uses its own default path) |
| `x-tenant-id` or `x-tanent` | Tenant identifier | `DEFAULT_TENANT_ID` env var |

### CTA URL resolution order (highest priority wins)

1. `data.ctaUrl` — caller supplies the complete final URL
2. `x-path` header — path is appended to the resolved `appUrl`
3. Template default — each template has a sensible built-in path (e.g. `/login`, `/billing`)

### Example

```bash
# Email branded for "Acme" with CTA pointing to Acme's frontend
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -H "x-app: Acme Corp" \
  -H "x-app-url: https://app.acme.com" \
  -H "x-path: /auth/reset-password" \
  -d '{
    "to": "user@acme.com",
    "templateId": "PASSWORD_RESET_REQUESTED",
    "data": { "username": "Alice", "resetToken": "tok123", "expiryHours": 1 }
  }'
```

Result: CTA button links to `https://app.acme.com/auth/reset-password`, footer says "Acme Corp".

---

## HTTP API

### POST `/send-email`

Queues the email (or sends immediately when Kafka is disabled).

**Request:**

```json
{
  "to": "user@example.com",
  "templateId": "USER_CREATED",
  "data": {
    "username": "John Doe"
  },
  "idempotencyKey": "user-123-welcome"
}
```

**Response `202`:**

```json
{
  "message": "Email queued for processing",
  "requestId": "abc123"
}
```

### POST `/send-email/sync`

Sends the email immediately and waits for the SMTP response.

**Response `200`:**

```json
{
  "message": "Email sent successfully",
  "messageId": "<smtp-message-id>",
  "requestId": "abc123"
}
```

### GET `/health`

Returns service health, SMTP connectivity status, and circuit breaker state.

### GET `/metrics`

Returns in-memory counters and MongoDB aggregate counts by status.

### GET `/email-logs`

Query persisted email logs.

**Query parameters:**

| Param | Description |
|-------|-------------|
| `status` | `queued` \| `sent` \| `failed` \| `retrying` |
| `startDate` | ISO 8601 start of date range |
| `endDate` | ISO 8601 end of date range |
| `limit` | Max records to return (default: `100`) |
| `skip` | Records to skip for pagination |

```bash
curl "http://localhost:3000/email-logs?status=failed&limit=50"
```

### GET `/email-logs/:requestId`

Retrieve a single email log by request ID.

---

## Payload Reference

```json
{
  "to":             "user@example.com",
  "from":           "noreply@yourapp.com",
  "templateId":     "PAYMENT_FAILED",
  "data":           {},
  "idempotencyKey": "pay-fail-txn-999",
  "cc":             "manager@yourapp.com",
  "bcc":            ["audit@yourapp.com"],
  "attachments": [
    {
      "filename":    "invoice.pdf",
      "content":     "<base64>",
      "contentType": "application/pdf",
      "encoding":    "base64"
    }
  ]
}
```

`idempotencyKey` accepts alphanumeric characters, hyphens, and underscores (e.g. UUIDs work).

---

## Kafka Integration

### Sending via Kafka producer

```javascript
await producer.send({
  topic: 'email.send',
  messages: [{
    key: userId,   // optional — used for message ordering
    value: JSON.stringify({
      to: 'user@example.com',
      templateId: 'ORDER_SHIPPED',
      data: {
        username: 'Jane',
        orderId: 'ORD-001',
        trackingLink: 'https://shipping.example.com/track/XYZ',
        // Per-app branding (replaces HTTP headers for Kafka callers)
        appUrl: 'https://myshop.com',
        applicationName: 'My Shop',
        ctaPath: `/orders/ORD-001/track`
      },
      idempotencyKey: 'order-ORD-001-shipped'
    })
  }]
});
```

### Listening for results

```javascript
// topic: email.success
{
  "originalMessage": { "to": "...", "templateId": "..." },
  "result": { "messageId": "<smtp-id>", "accepted": ["user@example.com"] }
}

// topic: email.failed
{
  "originalMessage": { "to": "...", "templateId": "..." },
  "error": { "message": "SMTP connection refused" },
  "retryCount": 3
}
```

---

## Template Data Reference

All templates accept the following **optional** branding fields in `data`:

| Field | Type | Description |
|-------|------|-------------|
| `appUrl` | string | Base URL for CTA buttons and links (overrides `x-app-url` header) |
| `applicationName` | string | Brand name in email footer (overrides `x-app` header) |
| `ctaPath` | string | Path appended to `appUrl` for the primary CTA |
| `ctaUrl` | string | Full CTA URL — highest priority, overrides everything |

Template-specific fields (like `resetLink`, `verifyLink`, `invoiceUrl`) always take precedence over `ctaUrl` when the template explicitly uses them.

### Common template examples

#### User created / welcome

```json
{
  "templateId": "USER_CREATED",
  "data": {
    "username": "Alice",
    "email": "alice@example.com",
    "userId": "usr_123",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

#### Password reset

```json
{
  "templateId": "PASSWORD_RESET_REQUESTED",
  "data": {
    "username": "Alice",
    "resetToken": "tok_abc123",
    "resetLink": "https://app.com/reset?token=tok_abc123",
    "expiryHours": 1
  }
}
```

#### Email verification

```json
{
  "templateId": "EMAIL_VERIFIED",
  "data": {
    "username": "Alice",
    "verifiedItem": "alice@example.com"
  }
}
```

#### Payment failed

```json
{
  "templateId": "PAYMENT_FAILED",
  "data": {
    "username": "Alice",
    "amount": "$49.99",
    "transactionId": "txn_999",
    "paymentMethod": "Visa ending 4242",
    "date": "2026-04-13T10:00:00Z",
    "failureReason": "Insufficient funds"
  }
}
```

#### Order shipped

```json
{
  "templateId": "ORDER_SHIPPED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "carrier": "FedEx",
    "trackingNumber": "1234567890",
    "trackingLink": "https://fedex.com/track/1234567890",
    "estimatedDelivery": "2026-04-16"
  }
}
```

#### Org member invited

```json
{
  "templateId": "ORG_MEMBER_INVITED",
  "data": {
    "orgName": "Acme Corp",
    "invitedBy": "Bob (bob@acme.com)",
    "inviteLink": "https://app.acme.com/invite/accept?token=inv_xyz",
    "expiryHours": 48
  }
}
```

---

## MongoDB Email Log Schema

```json
{
  "requestId":      "abc123",
  "to":             ["user@example.com"],
  "from":           "noreply@company.com",
  "cc":             [],
  "bcc":            [],
  "template":       "USER_CREATED",
  "templateId":     "USER_CREATED",
  "subject":        "Welcome to Company",
  "data":           {},
  "status":         "sent",
  "messageId":      "<smtp-message-id>",
  "error":          null,
  "retryCount":     0,
  "idempotencyKey": "user-123-welcome",
  "metadata": {
    "accepted":       ["user@example.com"],
    "rejected":       [],
    "processingTime": 1234
  },
  "sentAt":         "2026-04-13T10:30:00.000Z",
  "failedAt":       null,
  "createdAt":      "2026-04-13T10:30:00.000Z",
  "updatedAt":      "2026-04-13T10:30:05.000Z"
}
```

---

## Starting the Service

### Development (HTTP-only)

```bash
cp .env.example .env
# Set ENABLE_KAFKA=false in .env

docker run -d -p 27017:27017 --name mongodb mongo:7   # or use docker-compose
npm run dev
```

### Development (with Kafka)

```bash
# Set ENABLE_KAFKA=true in .env
docker-compose up -d
npm run dev
```

### Production (PM2)

```bash
pm2 start ecosystem.config.js --env production
```

### Production (Docker)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Idempotency

Sending the same `idempotencyKey` within the TTL window (default: 1 hour) returns the cached result without re-sending.

```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": { "username": "Alice" },
    "idempotencyKey": "user-alice-123-welcome"
  }'
```

Repeating this call within 1 hour returns the same `requestId` without sending another email.

---

## Error Handling

### Failed email log entry

```json
{
  "requestId": "xyz789",
  "status": "failed",
  "error": {
    "message": "SMTP connection refused",
    "code": "ECONNREFUSED"
  },
  "failedAt": "2026-04-13T10:30:00.000Z",
  "retryCount": 3
}
```

Kafka mode retries failed emails up to 3 times with exponential backoff before publishing to `email.failed`.

---

## Monitoring

```bash
# Service health + circuit breaker state
curl http://localhost:3000/health

# In-memory counters + DB aggregate
curl http://localhost:3000/metrics

# Application logs
tail -f logs/combined.log
tail -f logs/error.log
```

