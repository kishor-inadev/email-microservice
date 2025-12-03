# Email Microservice - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [HTTP-Only Mode](#http-only-mode)
5. [Kafka Mode](#kafka-mode)
6. [Email Templates](#email-templates)
7. [MongoDB Integration](#mongodb-integration)
8. [API Reference](#api-reference)
9. [Deployment](#deployment)
10. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

## Overview

This email microservice is a production-ready solution that supports two operational modes:

1. **HTTP-Only Mode** (Default): Direct email processing via HTTP API
2. **Kafka Mode**: Message queue-based email processing with enhanced reliability

Both modes include:
- MongoDB logging for all email activities
- Template-based email rendering
- Idempotency support
- Retry mechanisms
- Comprehensive monitoring
- Security features

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Email Service  │    │    MongoDB      │
│                 │    │                 │    │                 │
│ - Web App       │───▶│ - HTTP API      │───▶│ - Email Logs    │
│ - Mobile App    │    │ - Templates     │    │ - Metrics       │
│ - Backend       │    │ - SMTP Client   │    │ - Audit Trail   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   SMTP Server   │
                       │                 │
                       │ - Gmail         │
                       │ - SendGrid      │
                       │ - Brevo         │
                       │ - MailHog (dev) │
                       └─────────────────┘
```

### With Kafka Enabled

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Email Service  │    │     Kafka       │
│                 │    │                 │    │                 │
│ - Web App       │───▶│ - HTTP API      │───▶│ - email.send    │
│ - Mobile App    │    │ - Kafka Producer│    │ - email.success │
│ - Backend       │    │ - Kafka Consumer│◀───│ - email.failed  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    MongoDB      │    │   SMTP Server   │
                       │                 │    │                 │
                       │ - Email Logs    │    │ - Gmail         │
                       │ - Metrics       │    │ - SendGrid      │
                       │ - Audit Trail   │    │ - Brevo         │
                       └─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# MongoDB Configuration (Required)
MONGODB_URI=mongodb://localhost:27017/email-service
MONGODB_DB_NAME=email-service

# Kafka Configuration (Optional)
ENABLE_KAFKA=false
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=email-microservice
KAFKA_GROUP_ID=email-service-group
KAFKA_TOPIC_SEND=email.send
KAFKA_TOPIC_SUCCESS=email.success
KAFKA_TOPIC_FAILED=email.failed

# SMTP Configuration (Required)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourcompany.com
DEFAULT_FROM_NAME=Your Company

# Optional Features
EMAIL_RETRY_LIMIT=3
EMAIL_RETRY_BACKOFF_MS=5000
ENABLE_SYNC_ENDPOINT=true
IDEMPOTENCY_TTL_MS=3600000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (Optional - for production idempotency)
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=your-redis-password
```

### Key Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_KAFKA` | `false` | Enable/disable Kafka mode |
| `MONGODB_URI` | Required | MongoDB connection string |
| `SMTP_HOST` | Required | SMTP server hostname |
| `SMTP_USER` | Required | SMTP username |
| `SMTP_PASS` | Required | SMTP password |
| `EMAIL_RETRY_LIMIT` | `3` | Max retry attempts |
| `IDEMPOTENCY_TTL_MS` | `3600000` | Idempotency key TTL (1 hour) |

## HTTP-Only Mode

### How It Works

When `ENABLE_KAFKA=false` (default), the service operates in HTTP-only mode:

1. **Request Received**: Client sends HTTP POST to `/send-email`
2. **Validation**: Payload is validated using Joi schemas
3. **MongoDB Logging**: Email details saved with status "queued"
4. **Idempotency Check**: Duplicate prevention if key provided
5. **Email Sending**: Direct SMTP sending via nodemailer
6. **Status Update**: MongoDB updated with "sent" or "failed"
7. **Response**: Immediate response to client

### Flow Diagram

```
Client Request
      │
      ▼
┌─────────────┐
│ Validation  │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Save to DB  │ (status: queued)
└─────────────┘
      │
      ▼
┌─────────────┐
│ Send Email  │ (SMTP)
└─────────────┘
      │
      ▼
┌─────────────┐
│ Update DB   │ (status: sent/failed)
└─────────────┘
      │
      ▼
┌─────────────┐
│ Response    │
└─────────────┘
```

### Example Usage

```bash
# Send welcome email
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
  "messageId": "<unique-smtp-message-id>",
  "requestId": "abc123"
}
```

### Advantages of HTTP-Only Mode

- **Simplicity**: No Kafka infrastructure required
- **Immediate Feedback**: Instant success/failure response
- **Lower Latency**: Direct processing without queue delays
- **Easier Debugging**: Synchronous error handling

### Disadvantages of HTTP-Only Mode

- **Limited Scalability**: Blocking operations
- **No Retry Queue**: Failed emails require manual retry
- **Single Point of Failure**: Service downtime affects all emails
- **Resource Intensive**: SMTP connections per request

## Kafka Mode

### How It Works

When `ENABLE_KAFKA=true`, the service uses message queues:

1. **Request Received**: Client sends HTTP POST to `/send-email`
2. **Validation**: Payload is validated using Joi schemas
3. **MongoDB Logging**: Email details saved with status "queued"
4. **Kafka Publishing**: Message published to `email.send` topic
5. **Immediate Response**: Client receives queue confirmation
6. **Background Processing**: Kafka consumer processes message
7. **Email Sending**: SMTP sending with retry logic
8. **Status Updates**: MongoDB updated, success/failure published
9. **Result Publishing**: Messages sent to `email.success`/`email.failed`

### Flow Diagram

```
Client Request
      │
      ▼
┌─────────────┐
│ Validation  │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Save to DB  │ (status: queued)
└─────────────┘
      │
      ▼
┌─────────────┐
│ Publish to  │ (email.send topic)
│   Kafka     │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Response    │ (202 Accepted)
└─────────────┘

Background Processing:
┌─────────────┐
│ Kafka       │
│ Consumer    │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Send Email  │ (with retries)
└─────────────┘
      │
      ▼
┌─────────────┐
│ Update DB   │ (status: sent/failed)
└─────────────┘
      │
      ▼
┌─────────────┐
│ Publish     │ (email.success/failed)
│ Result      │
└─────────────┘
```

### Example Usage

```bash
# Send welcome email (queued)
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
  "message": "Email queued for processing",
  "requestId": "abc123"
}
```

### Kafka Topics

#### Input Topic: `email.send`
Messages published here trigger email sending.

**Message Format:**
```json
{
  "requestId": "abc123",
  "to": "user@example.com",
  "templateId": "USER_CREATED",
  "data": {
    "username": "John Doe",
    "companyName": "Acme Corp"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Success Topic: `email.success`
Published when emails are sent successfully.

**Message Format:**
```json
{
  "originalMessage": {
    "requestId": "abc123",
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": { ... }
  },
  "result": {
    "messageId": "<smtp-message-id>",
    "accepted": ["user@example.com"],
    "rejected": []
  },
  "status": "success",
  "timestamp": "2024-01-15T10:30:05.000Z"
}
```

#### Failure Topic: `email.failed`
Published when emails fail to send.

**Message Format:**
```json
{
  "originalMessage": {
    "requestId": "abc123",
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": { ... }
  },
  "error": {
    "message": "SMTP connection failed",
    "code": "ECONNREFUSED"
  },
  "status": "failed",
  "retryCount": 3,
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

### Consuming Result Messages

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'your-app',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'email-results' });

await consumer.subscribe({ 
  topics: ['email.success', 'email.failed'] 
});

await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const payload = JSON.parse(message.value.toString());
    
    if (topic === 'email.success') {
      console.log('Email sent:', payload.originalMessage.requestId);
      // Update your application state
    } else if (topic === 'email.failed') {
      console.error('Email failed:', payload.error.message);
      // Handle failure, retry, or alert
    }
  }
});
```

### Retry Logic

Kafka mode includes automatic retry with exponential backoff:

- **Max Retries**: 3 (configurable via `EMAIL_RETRY_LIMIT`)
- **Base Backoff**: 5 seconds (configurable via `EMAIL_RETRY_BACKOFF_MS`)
- **Exponential Backoff**: 5s, 10s, 20s with jitter
- **Retryable Errors**: Network timeouts, temporary SMTP errors
- **Non-Retryable Errors**: Authentication failures, template errors

### Advantages of Kafka Mode

- **High Scalability**: Asynchronous processing
- **Reliability**: Automatic retries and dead letter queues
- **Decoupling**: Service independence
- **Load Balancing**: Multiple consumer instances
- **Fault Tolerance**: Message persistence

### Disadvantages of Kafka Mode

- **Complexity**: Additional infrastructure required
- **Eventual Consistency**: Delayed processing
- **Debugging Complexity**: Distributed tracing needed
- **Resource Overhead**: Kafka cluster maintenance

## Email Templates

### Template System

The service uses a centralized template system in `src/templates/emailTemplate.js`. Each template is a JavaScript function that returns `{ subject, html, text }`.

### Available Templates

#### 1. USER_CREATED (Welcome Email)
**Template IDs**: `USER_CREATED`, `user-welcome`, `user-welcome-v2`

**Required Data:**
- `username`: User's display name
- `email`: User's email address

**Optional Data:**
- `activationUrl`: Account activation link
- `companyName`: Company name (default: "Company")

**Example:**
```json
{
  "templateId": "USER_CREATED",
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "activationUrl": "https://app.com/activate?token=abc123",
    "companyName": "Acme Corp"
  }
}
```

#### 2. PASSWORD_RESET
**Template IDs**: `PASSWORD_RESET`, `password-reset`, `password-reset-v1`

**Required Data:**
- `username`: User's display name
- `email`: User's email address
- `resetUrl`: Password reset link

**Optional Data:**
- `expiryTime`: Link expiration time (default: "1 hour")
- `companyName`: Company name (default: "Company")

**Example:**
```json
{
  "templateId": "PASSWORD_RESET",
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "resetUrl": "https://app.com/reset?token=xyz789",
    "expiryTime": "2 hours",
    "companyName": "Acme Corp"
  }
}
```

#### 3. ORDER_SUCCESS (Order Confirmation)
**Template IDs**: `ORDER_SUCCESS`, `order-confirmation`, `order-success-v1`

**Required Data:**
- `username`: Customer's name
- `email`: Customer's email
- `orderNumber`: Unique order identifier
- `orderTotal`: Total order value
- `currency`: Currency code (default: "USD")

**Optional Data:**
- `items`: Array of ordered items
- `shippingAddress`: Delivery address object
- `estimatedDelivery`: Delivery date
- `trackingUrl`: Order tracking link
- `companyName`: Company name (default: "Company")

**Example:**
```json
{
  "templateId": "ORDER_SUCCESS",
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
**Template IDs**: `CUSTOM_GENERIC_TEMPLATE`, `custom-message`, `custom-message-v1`

**Required Data:**
- `subject`: Email subject line
- `content`: Main email content

**Optional Data:**
- `username`: Recipient's name
- `email`: Recipient's email
- `title`: Email title/heading
- `theme`: Color theme ('blue', 'green', 'red', 'purple', 'orange')
- `ctaText`: Call-to-action button text
- `ctaUrl`: Call-to-action button URL
- `footerText`: Custom footer text
- `companyName`: Company name (default: "Company")

**Example:**
```json
{
  "templateId": "CUSTOM_GENERIC_TEMPLATE",
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "subject": "Important Update",
    "title": "System Maintenance Notice",
    "content": "We will be performing scheduled maintenance...",
    "theme": "orange",
    "ctaText": "View Maintenance Schedule",
    "ctaUrl": "https://app.com/maintenance",
    "footerText": "Thank you for your patience.",
    "companyName": "Acme Corp"
  }
}
```

### Creating Custom Templates

Add new templates to `src/templates/emailTemplate.js`:

```javascript
templates.MY_CUSTOM_TEMPLATE = function(data) {
  const { username, customField, companyName = 'Company' } = data;
  
  return {
    subject: `Custom Subject for ${username}`,
    html: `<html><body><h1>Custom HTML</h1><p>${customField}</p></body></html>`,
    text: `Custom text content: ${customField}`
  };
};
```

## MongoDB Integration

### Email Log Schema

Every email is logged to MongoDB with comprehensive details:

```javascript
{
  "requestId": "abc123",           // Unique request identifier
  "to": ["user@example.com"],      // Recipients (array)
  "from": "noreply@company.com",   // Sender
  "cc": [],                        // CC recipients
  "bcc": [],                       // BCC recipients
  "template": "USER_CREATED",      // Template name (legacy)
  "templateId": "USER_CREATED",    // Template ID (preferred)
  "subject": "Welcome to Company", // Rendered subject
  "data": { ... },                 // Template data
  "status": "sent",                // queued, sent, failed, retrying
  "messageId": "<smtp-id>",        // SMTP message ID
  "error": null,                   // Error details if failed
  "retryCount": 0,                 // Number of retry attempts
  "idempotencyKey": "user-123",    // Idempotency key
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

### Database Operations

#### Automatic Logging
All emails are automatically logged regardless of mode:
- **HTTP Mode**: Logged before and after sending
- **Kafka Mode**: Logged when queued and when processed

#### Status Tracking
Email status progression:
1. `queued` - Initial state when request received
2. `retrying` - During retry attempts (Kafka mode only)
3. `sent` - Successfully delivered
4. `failed` - Permanently failed after retries

#### Indexing
Optimized indexes for common queries:
- `requestId` (unique)
- `status`
- `createdAt`
- `idempotencyKey` (sparse)
- Compound index: `status + createdAt`

## API Reference

### Send Email (Async)

**Endpoint:** `POST /send-email`

**Description:** Queue email for processing (Kafka mode) or send immediately (HTTP mode)

**Request Body:**
```json
{
  "to": "user@example.com",
  "from": "sender@company.com",
  "templateId": "USER_CREATED",
  "data": {
    "username": "John Doe",
    "companyName": "Acme Corp"
  },
  "cc": ["manager@company.com"],
  "bcc": ["audit@company.com"],
  "idempotencyKey": "user-123-welcome",
  "attachments": [
    {
      "filename": "document.pdf",
      "content": "base64-encoded-content",
      "contentType": "application/pdf"
    }
  ]
}
```

**Response (Kafka Mode):**
```json
{
  "message": "Email queued for processing",
  "requestId": "abc123"
}
```

**Response (HTTP Mode):**
```json
{
  "message": "Email sent successfully",
  "messageId": "<smtp-message-id>",
  "requestId": "abc123"
}
```

### Send Email (Sync)

**Endpoint:** `POST /send-email/sync`

**Description:** Send email synchronously (available when `ENABLE_SYNC_ENDPOINT=true`)

**Request/Response:** Same as async endpoint, but always sends immediately

### Get Email Logs

**Endpoint:** `GET /email-logs`

**Query Parameters:**
- `status` - Filter by status (queued, sent, failed, retrying)
- `startDate` - Start date filter (ISO 8601)
- `endDate` - End date filter (ISO 8601)
- `limit` - Number of records (default: 100, max: 1000)
- `skip` - Records to skip for pagination
- `sort` - Sort order (JSON string, e.g., `{"createdAt": -1}`)

**Example:**
```bash
GET /email-logs?status=sent&limit=50&skip=0&startDate=2024-01-01T00:00:00Z
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

### Get Single Email Log

**Endpoint:** `GET /email-logs/:requestId`

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

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0"
}
```

### Metrics

**Endpoint:** `GET /metrics`

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

## Deployment

### Development Setup

#### HTTP-Only Mode (Recommended for Development)

```bash
# 1. Clone repository
git clone <repository-url>
cd email-microservice

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env and set:
# ENABLE_KAFKA=false
# MONGODB_URI=mongodb://localhost:27017/email-service
# SMTP_HOST=localhost (for MailHog)
# SMTP_PORT=1025

# 4. Start infrastructure
docker-compose up -d

# 5. Start service
npm run dev
```

This starts:
- MongoDB (port 27017)
- MailHog SMTP server (port 1025, UI: 8025)
- Redis (port 6379)
- Email service (port 3000)

#### Kafka Mode (Advanced Development)

```bash
# 1. Edit .env
ENABLE_KAFKA=true
KAFKA_BROKERS=localhost:9092

# 2. Start with Kafka
# Add Kafka services to docker-compose.yml or use separate Kafka setup

# 3. Start service
npm run dev
```

### Production Deployment

#### Docker Deployment

```bash
# Build image
docker build -t email-microservice .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

#### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs email-microservice
```

#### Environment-Specific Configuration

**Development:**
```bash
NODE_ENV=development
ENABLE_KAFKA=false
SMTP_HOST=localhost
SMTP_PORT=1025
LOG_LEVEL=debug
```

**Staging:**
```bash
NODE_ENV=staging
ENABLE_KAFKA=true
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
LOG_LEVEL=info
```

**Production:**
```bash
NODE_ENV=production
ENABLE_KAFKA=true
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=true
LOG_LEVEL=warn
REDIS_URL=redis://redis-cluster:6379
```

### Scaling Considerations

#### HTTP-Only Mode Scaling
- **Horizontal Scaling**: Multiple service instances behind load balancer
- **Database**: MongoDB replica set or cluster
- **Caching**: Redis for idempotency and session storage

#### Kafka Mode Scaling
- **Service Instances**: Multiple consumers for parallel processing
- **Kafka Partitions**: Increase partitions for higher throughput
- **Consumer Groups**: Separate groups for different processing speeds
- **Dead Letter Queues**: Handle permanently failed messages

## Monitoring & Troubleshooting

### Logging

#### Log Levels
- `error`: Critical errors requiring immediate attention
- `warn`: Warning conditions that should be monitored
- `info`: General operational messages
- `debug`: Detailed debugging information

#### Log Files
- `logs/combined.log`: All log messages
- `logs/error.log`: Error messages only
- `logs/exceptions.log`: Uncaught exceptions
- `logs/rejections.log`: Unhandled promise rejections

#### Structured Logging
All logs include:
- `timestamp`: ISO 8601 timestamp
- `level`: Log level
- `message`: Human-readable message
- `requestId`: Request correlation ID
- `service`: Service name
- Additional context fields

### Health Monitoring

#### Health Check Endpoint
```bash
curl http://localhost:3000/health
```

#### Service Dependencies
- **MongoDB**: Database connectivity
- **SMTP**: Email server connectivity
- **Kafka**: Message broker connectivity (if enabled)
- **Redis**: Cache connectivity (if configured)

### Performance Monitoring

#### Key Metrics
- **Email Throughput**: Emails processed per minute
- **Success Rate**: Percentage of successful deliveries
- **Response Time**: API response latency
- **Queue Depth**: Pending messages (Kafka mode)
- **Retry Rate**: Percentage of messages requiring retries

#### Monitoring Tools Integration
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **ELK Stack**: Log aggregation and analysis
- **APM Tools**: Application performance monitoring

### Troubleshooting Guide

#### Common Issues

**1. SMTP Connection Failures**
```
Error: ECONNREFUSED 127.0.0.1:587
```
- Check SMTP host and port configuration
- Verify network connectivity
- Confirm SMTP credentials
- Check firewall rules

**2. Template Not Found**
```
Error: Template not found: INVALID_TEMPLATE
```
- Verify template exists in `src/templates/emailTemplate.js`
- Check template name spelling and case
- Ensure template function is properly exported

**3. MongoDB Connection Issues**
```
Error: MongoNetworkError: failed to connect to server
```
- Verify MongoDB URI format
- Check MongoDB server status
- Confirm network connectivity
- Review authentication credentials

**4. Kafka Consumer Lag**
```
Consumer group lag increasing
```
- Scale consumer instances
- Increase partition count
- Optimize message processing
- Check consumer configuration

#### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug npm run dev
```

#### Database Queries

Monitor email processing:
```javascript
// Connect to MongoDB
use email-service

// Recent emails
db.emaillogs.find().sort({createdAt: -1}).limit(10)

// Failed emails
db.emaillogs.find({status: "failed"}).sort({createdAt: -1})

// Email statistics
db.emaillogs.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Processing time analysis
db.emaillogs.aggregate([
  { $match: { status: "sent" } },
  { $group: { 
    _id: null, 
    avgTime: { $avg: "$metadata.processingTime" },
    maxTime: { $max: "$metadata.processingTime" }
  }}
])
```

### Performance Optimization

#### HTTP-Only Mode
- **Connection Pooling**: Configure SMTP connection pools
- **Async Processing**: Use worker threads for heavy operations
- **Caching**: Cache rendered templates
- **Rate Limiting**: Prevent SMTP server overload

#### Kafka Mode
- **Batch Processing**: Process multiple messages together
- **Parallel Consumers**: Run multiple consumer instances
- **Message Compression**: Enable Kafka compression
- **Partition Strategy**: Optimize message distribution

### Security Considerations

#### Data Protection
- **Email Sanitization**: Mask email addresses in logs
- **Credential Security**: Use environment variables or secret managers
- **Template Validation**: Prevent code injection in templates
- **Input Validation**: Strict payload validation

#### Network Security
- **TLS/SSL**: Encrypt SMTP connections
- **VPC**: Deploy in private networks
- **Firewall Rules**: Restrict network access
- **API Authentication**: Implement API keys or JWT tokens

#### Compliance
- **GDPR**: Data retention and deletion policies
- **Audit Trails**: Comprehensive logging
- **Data Encryption**: Encrypt sensitive data at rest
- **Access Controls**: Role-based access management

This comprehensive documentation covers all aspects of the email microservice operation in both HTTP-only and Kafka modes. For additional support or specific use cases, refer to the code comments and example implementations in the repository.