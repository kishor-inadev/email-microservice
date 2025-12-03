# Email Microservice - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Option 1: HTTP-Only Mode (Recommended for beginners)

```bash
# 1. Clone and install
git clone <repository-url>
cd email-microservice
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env and set ENABLE_KAFKA=false

# 3. Start infrastructure
docker-compose up -d

# 4. Start service
npm run dev
```

**Test it:**
```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "templateId": "USER_CREATED",
    "data": {"username": "John Doe"}
  }'
```

Check emails at: http://localhost:8025 (MailHog UI)

### Option 2: Kafka Mode (Advanced)

```bash
# 1. Same setup as above, but set:
# ENABLE_KAFKA=true in .env

# 2. Add Kafka to docker-compose.yml or use external Kafka

# 3. Start service
npm run dev
```

## 📧 Send Your First Email

### Welcome Email
```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "USER_CREATED",
    "data": {
      "username": "John Doe",
      "email": "user@example.com",
      "companyName": "Your Company",
      "activationUrl": "https://yourapp.com/activate?token=abc123"
    }
  }'
```

### Password Reset
```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "templateId": "PASSWORD_RESET",
    "data": {
      "username": "John Doe",
      "email": "user@example.com",
      "resetUrl": "https://yourapp.com/reset?token=xyz789",
      "companyName": "Your Company"
    }
  }'
```

### Order Confirmation
```bash
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "customer@example.com",
    "templateId": "ORDER_SUCCESS",
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
      "companyName": "Your Company"
    }
  }'
```

## 🔍 Monitor Your Emails

### Check Email Logs
```bash
# All emails
curl http://localhost:3000/email-logs

# Failed emails only
curl "http://localhost:3000/email-logs?status=failed"

# Recent emails
curl "http://localhost:3000/email-logs?limit=10"
```

### View Metrics
```bash
curl http://localhost:3000/metrics
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 🔧 Configuration

### Essential Environment Variables

```bash
# Basic Configuration
NODE_ENV=development
PORT=3000
ENABLE_KAFKA=false  # Set to true for Kafka mode

# Database (Required)
MONGODB_URI=mongodb://localhost:27017/email-service

# Email (Required)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourcompany.com
DEFAULT_FROM_NAME=Your Company

# Kafka (Optional - only if ENABLE_KAFKA=true)
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_SEND=email.send
KAFKA_TOPIC_SUCCESS=email.success
KAFKA_TOPIC_FAILED=email.failed
```

## 🎯 Key Differences: HTTP vs Kafka Mode

| Feature | HTTP-Only Mode | Kafka Mode |
|---------|----------------|------------|
| **Setup Complexity** | Simple | Advanced |
| **Response Time** | Immediate | Queued (202) |
| **Scalability** | Limited | High |
| **Reliability** | Basic | Advanced (retries) |
| **Infrastructure** | MongoDB + SMTP | MongoDB + SMTP + Kafka |
| **Best For** | Small apps, testing | Production, high volume |

## 🚨 Troubleshooting

### Common Issues

**1. "Template not found" error**
- Check template name spelling
- Use `USER_CREATED`, `PASSWORD_RESET`, `ORDER_SUCCESS`, or `CUSTOM_GENERIC_TEMPLATE`

**2. SMTP connection failed**
- Verify SMTP credentials in `.env`
- For development, use MailHog (included in docker-compose)

**3. MongoDB connection error**
- Ensure MongoDB is running: `docker-compose ps`
- Check `MONGODB_URI` in `.env`

**4. Emails not appearing in MailHog**
- Visit http://localhost:8025
- Check service logs: `docker-compose logs email-service`

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## 📚 Next Steps

1. **Read Full Documentation**: See `COMPREHENSIVE_DOCUMENTATION.md`
2. **Customize Templates**: Edit `src/templates/emailTemplate.js`
3. **Production Setup**: Configure real SMTP provider (Gmail, SendGrid, Brevo)
4. **Enable Kafka**: For high-volume production use
5. **Add Monitoring**: Integrate with Prometheus/Grafana

## 🔗 Useful URLs (Development)

- **Service**: http://localhost:3000
- **MailHog UI**: http://localhost:8025
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics
- **Email Logs**: http://localhost:3000/email-logs

## 💡 Pro Tips

1. **Use Idempotency Keys**: Prevent duplicate emails
   ```json
   {"idempotencyKey": "user-123-welcome"}
   ```

2. **Test Templates**: Use the sync endpoint for immediate feedback
   ```bash
   curl -X POST http://localhost:3000/send-email/sync
   ```

3. **Monitor Logs**: Watch real-time logs
   ```bash
   tail -f logs/combined.log
   ```

4. **Database Queries**: Check email status directly
   ```bash
   # Connect to MongoDB
   docker exec -it <mongodb-container> mongo email-service
   # Query recent emails
   db.emaillogs.find().sort({createdAt: -1}).limit(5)
   ```

That's it! You're ready to send emails. For advanced features and production deployment, check the comprehensive documentation.