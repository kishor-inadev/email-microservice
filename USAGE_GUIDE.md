# Email Microservice - Usage Guide

## Overview

This email microservice now supports two modes of operation:

1. **HTTP-only mode** (default) - Direct email sending via HTTP API with MongoDB logging
2. **Kafka mode** (optional) - Message queue-based email sending with MongoDB logging

All email details are automatically saved to MongoDB for tracking and auditing.

## Configuration

### Environment Variables

```bash
# Enable/Disable Kafka (default: false)
ENABLE_KAFKA=false

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/email-service
MONGODB_DB_NAME=email-service

# SMTP Configuration
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourcompany.com
DEFAULT_FROM_NAME=Your Company
```

## Mode 1: HTTP-Only Mode (Default)

When `ENABLE_KAFKA=false` (or not set), the service operates in HTTP-only mode:

### Sending Email

```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": {
      "username": "John Doe",
      "email": "user@example.com",
      "companyName": "Acme Corp"
    }
  }'
```

**Response:**
```json
{
  "message": "Email sent successfully",
  "messageId": "<unique-message-id>",
  "requestId": "abc123"
}
```

### What Happens:
1. Request is validated
2. Email details are saved to MongoDB with status: "queued"
3. Email is sent immediately via SMTP
4. MongoDB is updated with status: "sent" and message details
5. Response is returned to the client

## Mode 2: Kafka Mode

When `ENABLE_KAFKA=true`, the service uses Kafka for message queuing:

### Sending Email

```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": {
      "username": "John Doe",
      "email": "user@example.com"
    }
  }'
```

**Response:**
```json
{
  "message": "Email queued for processing",
  "requestId": "abc123"
}
```

### What Happens:
1. Request is validated
2. Email details are saved to MongoDB with status: "queued"
3. Message is published to Kafka topic: `email.send`
4. Kafka consumer picks up the message
5. Email is sent via SMTP
6. MongoDB is updated with status: "sent" or "failed"
7. Success/failure message is published to Kafka topics: `email.success` or `email.failed`

## MongoDB Integration

### Email Log Schema

Every email is logged to MongoDB with the following structure:

```javascript
{
  "requestId": "abc123",
  "to": ["user@example.com"],
  "from": "noreply@company.com",
  "cc": [],
  "bcc": [],
  "template": "USER_CREATED",
  "templateId": "USER_CREATED",
  "subject": "Welcome to Company",
  "data": { ... },
  "status": "sent", // queued, sent, failed, retrying
  "messageId": "<smtp-message-id>",
  "error": null,
  "retryCount": 0,
  "idempotencyKey": "user-123-welcome",
  "metadata": {
    "accepted": ["user@example.com"],
    "rejected": [],
    "processingTime": 1234
  },
  "sentAt": "2024-01-15T10:30:00.000Z",
  "failedAt": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:05.000Z"
}
```

### Querying Email Logs

#### Get All Email Logs

```bash
curl http://localhost:3000/email-logs
```

**Query Parameters:**
- `status` - Filter by status (queued, sent, failed, retrying)
- `startDate` - Filter by date range (ISO 8601)
- `endDate` - Filter by date range (ISO 8601)
- `limit` - Number of records to return (default: 100)
- `skip` - Number of records to skip (pagination)
- `sort` - Sort order (JSON string, e.g., `{"createdAt": -1}`)

**Example:**
```bash
# Get failed emails from the last 24 hours
curl "http://localhost:3000/email-logs?status=failed&startDate=2024-01-14T00:00:00Z&limit=50"

# Get all sent emails (paginated)
curl "http://localhost:3000/email-logs?status=sent&limit=100&skip=0"
```

**Response:**
```json
{
  "logs": [
    {
      "requestId": "abc123",
      "to": ["user@example.com"],
      "status": "sent",
      "sentAt": "2024-01-15T10:30:00.000Z",
      ...
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 2
}
```

#### Get Single Email Log

```bash
curl http://localhost:3000/email-logs/abc123
```

**Response:**
```json
{
  "requestId": "abc123",
  "to": ["user@example.com"],
  "from": "noreply@company.com",
  "status": "sent",
  "messageId": "<smtp-message-id>",
  "sentAt": "2024-01-15T10:30:00.000Z",
  ...
}
```

### Metrics with Database Stats

```bash
curl http://localhost:3000/metrics
```

**Response:**
```json
{
  "metrics": {
    "emails_sent_total": 150,
    "emails_failed_total": 5,
    "emails_retried_total": 12,
    "emails_processed_total": 155,
    "service_uptime_ms": 3600000,
    "service_uptime_seconds": 3600
  },
  "database": {
    "total": 155,
    "sent": 150,
    "failed": 5,
    "queued": 0,
    "retrying": 0
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Email Templates

### Available Templates

1. **USER_CREATED** - Welcome email for new users
2. **PASSWORD_RESET** - Password reset email
3. **ORDER_SUCCESS** - Order confirmation
4. **CUSTOM_GENERIC_TEMPLATE** - Custom content template

### Example: Send Welcome Email

```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": {
      "username": "John Doe",
      "email": "user@example.com",
      "activationUrl": "https://app.com/activate?token=abc123",
      "companyName": "Acme Corp"
    },
    "idempotencyKey": "user-123-welcome"
  }'
```

## Starting the Service

### Development Mode (HTTP-only with MongoDB)

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and set ENABLE_KAFKA=false

# Start MongoDB locally
# Option 1: Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# Option 2: Using docker-compose
docker-compose up -d

# Start the service
npm run dev
```

### Production Mode with Kafka

```bash
# Edit .env and set ENABLE_KAFKA=true
# Set Kafka broker URLs
ENABLE_KAFKA=true
KAFKA_BROKERS=kafka1:9092,kafka2:9092

# Start with PM2
pm2 start ecosystem.config.js --env production
```

## Docker Deployment

### HTTP-only Mode

```bash
docker-compose up
```

This starts:
- MongoDB (port 27017)
- MailHog SMTP server (port 1025, UI: 8025)
- Redis (port 6379)
- Email service (port 3100)

### Kafka Mode

Update `docker-compose.yml` to add Kafka services and set `ENABLE_KAFKA=true`, then:

```bash
docker-compose up
```

## Idempotency

Prevent duplicate emails by providing an `idempotencyKey`:

```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": { ... },
    "idempotencyKey": "user-123-welcome"
  }'
```

If the same `idempotencyKey` is used within the TTL period (default: 1 hour), the email won't be sent again.

## Error Handling

### Failed Email Example

If an email fails to send, it's logged to MongoDB:

```json
{
  "requestId": "xyz789",
  "status": "failed",
  "error": {
    "message": "SMTP connection refused",
    "code": "ECONNREFUSED"
  },
  "failedAt": "2024-01-15T10:30:00.000Z",
  "retryCount": 3
}
```

### Retry Logic (Kafka Mode Only)

In Kafka mode, failed emails are automatically retried up to 3 times with exponential backoff.

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### View Email Logs

```bash
# View all logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log
```

### Query Database Directly

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/email-service

# Find recent emails
db.emaillogs.find().sort({createdAt: -1}).limit(10)

# Count by status
db.emaillogs.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

## Switching Between Modes

Simply change the `ENABLE_KAFKA` environment variable and restart:

```bash
# Switch to HTTP-only mode
ENABLE_KAFKA=false npm run dev

# Switch to Kafka mode
ENABLE_KAFKA=true npm run dev
```

All email logs remain in MongoDB regardless of the mode used.
