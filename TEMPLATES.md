# Email Templates Reference

Complete reference for all 375 email templates. Use `templateId` in your request payload to select a template.

## Request Envelope

Every request requires these **top-level fields** alongside `data`. These are NOT inside `data`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string \| string[] | **Yes** | Recipient email address(es) |
| `templateId` | string | **Yes** | Template name (use this or `template`) |
| `template` | string | **Yes** | Alias for `templateId` |
| `data` | object | No | Template variables (see per-template payload) |
| `from` | string | No | Sender address (overrides env `EMAIL_FROM`) |
| `cc` | string \| string[] | No | CC recipient(s) |
| `bcc` | string \| string[] | No | BCC recipient(s) |
| `idempotencyKey` | string | No | Deduplication key — alphanumeric, hyphens, underscores (e.g. a UUID) |
| `attachments` | object[] | No | Array of `{ filename, content, contentType, encoding }` |

**Minimal example:**

```json
{
  "to": "alice@example.com",
  "templateId": "USER_WELCOME",
  "data": { "username": "Alice", "verifyLink": "https://app.com/verify?token=abc" }
}
```

**Full example with all envelope fields:**

```json
{
  "to": ["alice@example.com", "bob@example.com"],
  "from": "noreply@myapp.com",
  "cc": "manager@myapp.com",
  "bcc": "archive@myapp.com",
  "templateId": "ORDER_SHIPPED",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "UPS",
    "estimatedDelivery": "2026-04-18",
    "trackingUrl": "https://ups.com/track?num=1Z999AA10123456784"
  }
}
```

---

## Global Branding Fields

Every template accepts these optional fields inside `data` to override per-request branding:

| Field | Type | Description |
|-------|------|-------------|
| `appUrl` | string | Base URL for all CTA buttons and links |
| `applicationName` | string | App/brand name shown in email footer |
| `ctaPath` | string | Path appended to `appUrl` for the primary CTA |
| `ctaUrl` | string | Full CTA URL (highest priority — overrides template default) |

You can also set these via HTTP headers instead of `data` fields:
- `x-app-url` → `appUrl`
- `x-app` → `applicationName`
- `x-path` → `ctaPath`

---

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Security & Account Safety](#2-security--account-safety)
3. [Organization & Team](#3-organization--team)
4. [Payments & Billing](#4-payments--billing)
5. [Subscriptions](#5-subscriptions)
6. [Cart & Wishlist](#6-cart--wishlist)
7. [Orders](#7-orders)
8. [Returns & Exchanges](#8-returns--exchanges)
9. [Shipping & Delivery](#9-shipping--delivery)
10. [Products & Inventory](#10-products--inventory)
11. [System & Infrastructure](#11-system--infrastructure)
12. [Marketing & Promotions](#12-marketing--promotions)
13. [Notifications & Messaging](#13-notifications--messaging)
14. [Analytics & Reports](#14-analytics--reports)
15. [Leads & CRM](#15-leads--crm)
16. [Marketplace](#16-marketplace)
17. [Legacy Templates](#17-legacy-templates)

---

## 1. Authentication & User Management

> **Note:** All examples below show the complete request body. `to` is always required at the top level. Fields inside `data` are the template variables.

### `USER_CREATED`
Sent to admin when a new user registers.

```json
{
  "to": "admin@yourapp.com",
  "templateId": "USER_CREATED",
  "data": {
    "userId": "usr_123",
    "username": "Alice Smith",
    "email": "alice@example.com",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `USER_WELCOME`
Sent to the new user with an email verification link.

```json
{
  "to": "user@example.com",
  "templateId": "USER_WELCOME",
  "data": {
    "userId": "usr_123",
    "username": "Alice Smith",
    "email": "alice@example.com",
    "verifyLink": "https://app.com/verify?token=abc123",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ADMIN_USER_REGISTERED`
Admin notification when a new user signs up.

```json
{
  "to": "user@example.com",
  "templateId": "ADMIN_USER_REGISTERED",
  "data": {
    "userId": "usr_123",
    "username": "Alice Smith",
    "email": "alice@example.com",
    "registeredAt": "2026-04-13T10:00:00Z",
    "ipAddress": "192.168.1.1"
  }
}
```

---

### `USER_UPDATED`
Sent when a user's profile is updated.

```json
{
  "to": "user@example.com",
  "templateId": "USER_UPDATED",
  "data": {
    "userId": "usr_123",
    "username": "Alice Smith",
    "email": "alice@example.com",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `USER_DELETED`
Sent when a user account is deleted.

```json
{
  "to": "user@example.com",
  "templateId": "USER_DELETED",
  "data": {
    "userId": "usr_123",
    "username": "Alice Smith",
    "email": "alice@example.com",
    "timestamp": "2026-04-13T10:00:00Z",
    "reason": "User requested deletion"
  }
}
```

---

### `USER_SUSPENDED`
Sent when a user account is suspended.

```json
{
  "to": "user@example.com",
  "templateId": "USER_SUSPENDED",
  "data": {
    "userId": "usr_123",
    "username": "Alice Smith",
    "email": "alice@example.com",
    "timestamp": "2026-04-13T10:00:00Z",
    "reason": "Violation of terms of service"
  }
}
```

---

### `USER_REINSTATED`
Sent when a suspended account is reinstated.

```json
{
  "to": "user@example.com",
  "templateId": "USER_REINSTATED",
  "data": {
    "userId": "usr_123",
    "username": "Alice Smith",
    "email": "alice@example.com",
    "timestamp": "2026-04-13T10:00:00Z",
    "reason": "Suspension lifted after review"
  }
}
```

---

### `ROLE_ASSIGNED`
Sent when a role is assigned to a user.

```json
{
  "to": "user@example.com",
  "templateId": "ROLE_ASSIGNED",
  "data": {
    "username": "Alice Smith",
    "roleName": "Editor",
    "permissions": ["read", "write", "publish"],
    "changedBy": "admin@company.com"
  }
}
```

---

### `ROLE_REVOKED`
Sent when a role is removed from a user.

```json
{
  "to": "user@example.com",
  "templateId": "ROLE_REVOKED",
  "data": {
    "username": "Alice Smith",
    "roleName": "Editor",
    "permissions": ["read", "write", "publish"],
    "changedBy": "admin@company.com"
  }
}
```

---

### `PERMISSION_CHANGED`
Sent when a user's permissions are modified.

```json
{
  "to": "user@example.com",
  "templateId": "PERMISSION_CHANGED",
  "data": {
    "username": "Alice Smith",
    "roleName": "Editor",
    "permissions": ["read", "write"],
    "changedBy": "admin@company.com"
  }
}
```

---

### `EMAIL_VERIFIED`
Sent when a user's email address is verified.

```json
{
  "to": "user@example.com",
  "templateId": "EMAIL_VERIFIED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "verifiedItem": "alice@example.com"
  }
}
```

---

### `PHONE_VERIFIED`
Sent when a user's phone number is verified.

```json
{
  "to": "user@example.com",
  "templateId": "PHONE_VERIFIED",
  "data": {
    "username": "alice_smith",
    "verifiedItem": "+1-555-0100"
  }
}
```

---

### `PROFILE_COMPLETED`
Sent when a user completes their profile.

```json
{
  "to": "user@example.com",
  "templateId": "PROFILE_COMPLETED",
  "data": {
    "username": "alice_smith",
    "verifiedItem": "Profile"
  }
}
```

---

### `PROFILE_PICTURE_UPDATED`
Sent when a user updates their profile picture.

```json
{
  "to": "user@example.com",
  "templateId": "PROFILE_PICTURE_UPDATED",
  "data": {
    "username": "alice_smith",
    "verifiedItem": "Profile picture"
  }
}
```

---

### `LOGIN_SUCCESS`
Sent on successful login (informational).

```json
{
  "to": "user@example.com",
  "templateId": "LOGIN_SUCCESS",
  "data": {
    "username": "alice_smith",
    "ipAddress": "203.0.113.5",
    "location": "New York, US",
    "device": "Chrome on Windows",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `MAGIC_LINK`
Sends a one-click magic sign-in link.

```json
{
  "to": "user@example.com",
  "templateId": "MAGIC_LINK",
  "data": {
    "username": "Alice",
    "magicUrl": "https://app.com/auth/magic?token=tok_xyz",
    "expiryMinutes": 15
  }
}
```

---

### `EMAIL_VERIFICATION_SEND`
Sends an email verification code/token.

```json
{
  "to": "user@example.com",
  "templateId": "EMAIL_VERIFICATION_SEND",
  "data": {
    "username": "alice_smith",
    "token": "ABC123",
    "security": "This link expires in 24 hours."
  }
}
```

---

### `USER_EMAIL_VERIFIED`
Confirmation that the user's email was verified.

```json
{
  "to": "user@example.com",
  "templateId": "USER_EMAIL_VERIFIED",
  "data": {
    "username": "alice_smith"
  }
}
```

---

### `CONSENT_REQUIRED`
Sent when a user's consent is required for a policy.

```json
{
  "to": "user@example.com",
  "templateId": "CONSENT_REQUIRED",
  "data": {
    "username": "alice_smith",
    "consentType": "Data Processing Agreement",
    "detailsUrl": "https://app.com/consent/dpa"
  }
}
```

---

### `CONSENT_REVOKED`
Sent when a user revokes consent.

```json
{
  "to": "user@example.com",
  "templateId": "CONSENT_REVOKED",
  "data": {
    "username": "alice_smith",
    "consentType": "Marketing Emails",
    "detailsUrl": "https://app.com/privacy/consent"
  }
}
```

---

### `ACCOUNT_MERGED`
Sent when two user accounts are merged.

```json
{
  "to": "user@example.com",
  "templateId": "ACCOUNT_MERGED",
  "data": {
    "username": "alice_smith",
    "accountId": "usr_123",
    "reason": "Duplicate account consolidation",
    "supportUrl": "https://app.com/support"
  }
}
```

---

### `ACCOUNT_TERMINATED`
Sent when a user account is permanently terminated.

```json
{
  "to": "user@example.com",
  "templateId": "ACCOUNT_TERMINATED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "accountId": "usr_123",
    "reason": "Terms of service violation",
    "supportUrl": "https://app.com/support"
  }
}
```

---

### `PASSWORD_CHANGED`
Sent after a user's password is successfully changed.

```json
{
  "to": "user@example.com",
  "templateId": "PASSWORD_CHANGED",
  "data": {
    "name": "Alice",
    "username": "alice_smith"
  }
}
```

---

### `PASSWORD_RESET_REQUESTED`
Sends the password reset link.

```json
{
  "to": "user@example.com",
  "templateId": "PASSWORD_RESET_REQUESTED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "resetToken": "tok_reset_abc",
    "resetLink": "https://app.com/reset?token=tok_reset_abc",
    "expiryHours": 1
  }
}
```
> `resetLink` takes precedence over `resetToken` (token is used to auto-build the URL if `resetLink` is absent).

---

### `PASSWORD_RESET_COMPLETED`
Confirmation after a password reset is completed.

```json
{
  "to": "user@example.com",
  "templateId": "PASSWORD_RESET_COMPLETED",
  "data": {
    "name": "Alice",
    "username": "alice_smith"
  }
}
```

---

### `PASSWORD_EXPIRED`
Sent when a user's password has expired.

```json
{
  "to": "user@example.com",
  "templateId": "PASSWORD_EXPIRED",
  "data": {
    "username": "alice_smith",
    "resetToken": "tok_reset_abc",
    "resetUrl": "https://app.com/reset?token=tok_reset_abc"
  }
}
```

---

### `PRIVACY_POLICY_UPDATED`
Notifies users of a privacy policy update.

```json
{
  "to": "user@example.com",
  "templateId": "PRIVACY_POLICY_UPDATED",
  "data": {
    "effectiveDate": "2026-05-01",
    "changesUrl": "https://app.com/privacy/changelog",
    "documentUrl": "https://app.com/privacy"
  }
}
```

---

### `TERMS_OF_SERVICE_UPDATED`
Notifies users of a terms of service update.

```json
{
  "to": "user@example.com",
  "templateId": "TERMS_OF_SERVICE_UPDATED",
  "data": {
    "effectiveDate": "2026-05-01",
    "changesUrl": "https://app.com/terms/changelog",
    "documentUrl": "https://app.com/terms"
  }
}
```

---

### `TRIAL_EXPIRING`
Sent when a free trial is about to end.

```json
{
  "to": "user@example.com",
  "templateId": "TRIAL_EXPIRING",
  "data": {
    "username": "alice_smith",
    "daysLeft": 3,
    "planName": "Pro",
    "upgradeUrl": "https://app.com/billing/upgrade"
  }
}
```

---

### `DATA_EXPORT_READY`
Sent when a user's GDPR data export is ready.

```json
{
  "to": "user@example.com",
  "templateId": "DATA_EXPORT_READY",
  "data": {
    "username": "alice_smith",
    "downloadUrl": "https://app.com/export/download?token=exp_abc",
    "expiryHours": 24
  }
}
```

---

### `BIRTHDAY_GREETING`
Birthday email with optional discount code.

```json
{
  "to": "user@example.com",
  "templateId": "BIRTHDAY_GREETING",
  "data": {
    "username": "Alice",
    "discountCode": "BDAY20",
    "discountPercent": 20,
    "offerUrl": "https://app.com/shop"
  }
}
```

---

### `NEWSLETTER_WELCOME`
Welcome to newsletter / mailing list.

```json
{
  "to": "user@example.com",
  "templateId": "NEWSLETTER_WELCOME",
  "data": {
    "email": "alice@example.com",
    "companyName": "Acme Corp",
    "unsubscribeUrl": "https://app.com/unsubscribe?token=unsub_abc"
  }
}
```

---

### `TEAM_INVITE`
Invites someone to join a team.

```json
{
  "to": "user@example.com",
  "templateId": "TEAM_INVITE",
  "data": {
    "inviteeEmail": "bob@example.com",
    "inviteeName": "Bob",
    "invitedBy": "Alice (alice@company.com)",
    "teamName": "Engineering",
    "role": "Developer",
    "inviteUrl": "https://app.com/teams/accept?token=inv_xyz",
    "expiresAt": "2026-04-20T00:00:00Z"
  }
}
```

---

## 2. Security & Account Safety

### `LOGIN_FAILED`
Alert on a failed login attempt.

```json
{
  "to": "user@example.com",
  "templateId": "LOGIN_FAILED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "ipAddress": "203.0.113.5",
    "location": "Unknown",
    "device": "Chrome on Linux",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `NEW_DEVICE_LOGIN`
Alert when a sign-in occurs from a new / unrecognised device.

```json
{
  "to": "user@example.com",
  "templateId": "NEW_DEVICE_LOGIN",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "ipAddress": "203.0.113.5",
    "location": "London, UK",
    "device": "Safari on iPhone",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ACCOUNT_LOCKED`
Sent when an account is locked due to failed login attempts.

```json
{
  "to": "user@example.com",
  "templateId": "ACCOUNT_LOCKED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "maxAttempts": 5,
    "reason": "Too many failed login attempts",
    "supportUrl": "https://app.com/support"
  }
}
```

---

### `ACCOUNT_UNLOCKED`
Sent when an account lock is lifted.

```json
{
  "to": "user@example.com",
  "templateId": "ACCOUNT_UNLOCKED",
  "data": {
    "name": "Alice",
    "username": "alice_smith"
  }
}
```

---

### `ACCOUNT_RECOVERY_REQUESTED`
Sent when an account recovery is initiated.

```json
{
  "to": "user@example.com",
  "templateId": "ACCOUNT_RECOVERY_REQUESTED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "unlockLink": "https://app.com/account/unlock?token=rec_abc",
    "expiryHours": 24,
    "accountId": "usr_123",
    "reason": "Lost access to MFA device",
    "supportUrl": "https://app.com/support"
  }
}
```

---

### `ACCOUNT_RECOVERY_COMPLETED`
Sent after a successful account recovery.

```json
{
  "to": "user@example.com",
  "templateId": "ACCOUNT_RECOVERY_COMPLETED",
  "data": {
    "username": "alice_smith",
    "accountId": "usr_123",
    "reason": "Identity verified",
    "supportUrl": "https://app.com/support"
  }
}
```

---

### `SOCIAL_LOGIN_CONNECTED`
Notifies user that a social login provider was connected.

```json
{
  "to": "user@example.com",
  "templateId": "SOCIAL_LOGIN_CONNECTED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "provider": "Google",
    "email": "alice@gmail.com",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `SOCIAL_LOGIN_DISCONNECTED`
Notifies user that a social login provider was disconnected.

```json
{
  "to": "user@example.com",
  "templateId": "SOCIAL_LOGIN_DISCONNECTED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "provider": "Google",
    "email": "alice@gmail.com",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `MFA_ENABLED`
Confirmation that two-factor authentication was enabled.

```json
{
  "to": "user@example.com",
  "templateId": "MFA_ENABLED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "device": "Authenticator App",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `MFA_DISABLED`
Alert that two-factor authentication was disabled.

```json
{
  "to": "user@example.com",
  "templateId": "MFA_DISABLED",
  "data": {
    "name": "Alice",
    "username": "alice_smith",
    "device": "Authenticator App",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `SESSION_EXPIRED`
Notifies user that their session has expired.

```json
{
  "to": "user@example.com",
  "templateId": "SESSION_EXPIRED",
  "data": {
    "username": "alice_smith",
    "device": "Chrome on Windows",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

---

### `CONTACT_NOTIFICATION`
Internal notification when a contact form is submitted.

```json
{
  "to": "user@example.com",
  "templateId": "CONTACT_NOTIFICATION",
  "data": {
    "name": "Bob Customer",
    "email": "bob@example.com",
    "phone": "+1-555-0101",
    "company": "ACME Ltd",
    "subject": "Partnership inquiry",
    "message": "Hello, we'd like to discuss a potential partnership...",
    "submittedAt": "2026-04-13T10:00:00Z",
    "contactId": "cnt_abc"
  }
}
```

---

### `CONTACT_REPLY`
Reply to a customer contact form submission.

```json
{
  "to": "user@example.com",
  "templateId": "CONTACT_REPLY",
  "data": {
    "name": "Bob Customer",
    "email": "bob@example.com",
    "phone": "+1-555-0101",
    "company": "ACME Ltd",
    "subject": "Partnership inquiry",
    "message": "Thank you for reaching out...",
    "submittedAt": "2026-04-13T10:00:00Z",
    "contactId": "cnt_abc"
  }
}
```

---

### `CONTACT_CONFIRMATION`
Auto-confirmation sent to the person who submitted the contact form.

```json
{
  "to": "user@example.com",
  "templateId": "CONTACT_CONFIRMATION",
  "data": {
    "name": "Bob Customer",
    "subject": "Partnership inquiry",
    "companyName": "Acme Corp",
    "contactId": "cnt_abc"
  }
}
```

---

### `INQUIRY_NOTIFICATION`
Admin notification for a new project inquiry.

```json
{
  "to": "user@example.com",
  "templateId": "INQUIRY_NOTIFICATION",
  "data": {
    "name": "Bob Customer",
    "email": "bob@example.com",
    "phone": "+1-555-0101",
    "company": "ACME Ltd",
    "projectType": "Web Application",
    "budget": "$10,000 - $25,000",
    "timeline": "3 months",
    "description": "We need a custom CRM...",
    "requirements": ["React frontend", "REST API", "MongoDB"],
    "submittedAt": "2026-04-13T10:00:00Z",
    "inquiryId": "inq_xyz"
  }
}
```

---

### `INQUIRY_CONFIRMATION`
Auto-confirmation sent to the person who submitted a project inquiry.

```json
{
  "to": "user@example.com",
  "templateId": "INQUIRY_CONFIRMATION",
  "data": {
    "name": "Bob Customer",
    "projectType": "Web Application",
    "budget": "$10,000 - $25,000",
    "timeline": "3 months",
    "companyName": "Acme Corp",
    "inquiryId": "inq_xyz"
  }
}
```

---

## 3. Organization & Team

### `ORG_CREATED`
Sent when a new organisation is created.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_CREATED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "adminName": "Alice Smith",
    "adminEmail": "alice@acme.com",
    "createdAt": "2026-04-13T10:00:00Z",
    "planName": "Business"
  }
}
```

---

### `ORG_UPDATED`
Sent when organisation details are updated.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_UPDATED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "updatedBy": "alice@acme.com",
    "updatedFields": ["name", "logo", "billing_email"],
    "updatedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ORG_DELETED`
Sent when an organisation is deleted.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_DELETED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "deletedBy": "alice@acme.com",
    "deletedAt": "2026-04-13T10:00:00Z",
    "reason": "Company shut down"
  }
}
```

---

### `ORG_PLAN_CHANGED`
Sent when an organisation changes its subscription plan.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_PLAN_CHANGED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "oldPlan": "Starter",
    "newPlan": "Business",
    "changedBy": "alice@acme.com",
    "effectiveDate": "2026-05-01",
    "features": ["Unlimited members", "SSO", "Advanced analytics"]
  }
}
```

---

### `ORG_MEMBER_INVITED`
Sent to the invitee when they are invited to an organisation.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_MEMBER_INVITED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "inviteeEmail": "bob@example.com",
    "inviteeName": "Bob",
    "invitedBy": "Alice Smith",
    "role": "Member",
    "inviteUrl": "https://app.com/invite/accept?token=inv_xyz",
    "expiresAt": "2026-04-20T00:00:00Z"
  }
}
```

---

### `ORG_MEMBER_REMOVED`
Sent when a member is removed from an organisation.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_MEMBER_REMOVED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "memberName": "Bob Jones",
    "memberEmail": "bob@example.com",
    "removedBy": "Alice Smith",
    "reason": "Left the company",
    "removedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ORG_ROLE_ASSIGNED`
Sent when a member is assigned an org role.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_ROLE_ASSIGNED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "memberName": "Bob Jones",
    "memberEmail": "bob@acme.com",
    "roleName": "Admin",
    "assignedBy": "Alice Smith",
    "permissions": ["manage_members", "manage_billing"],
    "assignedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ORG_ROLE_CHANGED`
Sent when a member's org role is changed.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_ROLE_CHANGED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "memberName": "Bob Jones",
    "memberEmail": "bob@acme.com",
    "oldRole": "Member",
    "newRole": "Admin",
    "changedBy": "Alice Smith",
    "changedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ORG_ROLE_REVOKED`
Sent when a member's org role is revoked.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_ROLE_REVOKED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "memberName": "Bob Jones",
    "memberEmail": "bob@acme.com",
    "roleName": "Admin",
    "revokedBy": "Alice Smith",
    "revokedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ORG_SECURITY_POLICY_UPDATED`
Sent when an org security policy is updated.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_SECURITY_POLICY_UPDATED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "updatedBy": "alice@acme.com",
    "policyChanges": ["MFA required", "Session timeout: 4 hours"],
    "effectiveDate": "2026-04-20",
    "requiresAction": true
  }
}
```

---

### `ORG_API_KEY_CREATED`
Sent when a new API key is created for an organisation.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_API_KEY_CREATED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "keyName": "Production Key",
    "keyPrefix": "ak_prod_",
    "createdBy": "alice@acme.com",
    "permissions": ["read:users", "write:orders"],
    "expiresAt": "2027-04-13T00:00:00Z"
  }
}
```

---

### `ORG_API_KEY_REVOKED`
Sent when an API key is revoked.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_API_KEY_REVOKED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "keyName": "Production Key",
    "keyPrefix": "ak_prod_",
    "revokedBy": "alice@acme.com",
    "revokedAt": "2026-04-13T10:00:00Z",
    "reason": "Compromised"
  }
}
```

---

### `ORG_DOMAIN_VERIFIED`
Sent when an organisation's domain is verified.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_DOMAIN_VERIFIED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "domain": "acme.com",
    "verifiedBy": "alice@acme.com",
    "verifiedAt": "2026-04-13T10:00:00Z",
    "benefits": ["SSO enabled", "Auto-join for @acme.com emails"]
  }
}
```

---

### `ORG_DOMAIN_UNVERIFIED`
Sent when an organisation's domain verification is removed.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_DOMAIN_UNVERIFIED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "domain": "acme.com",
    "reason": "DNS records removed",
    "unverifiedBy": "system",
    "unverifiedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `ORG_BILLING_UPDATED`
Sent when billing information is updated for an organisation.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_BILLING_UPDATED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "updatedBy": "alice@acme.com",
    "updatedFields": ["payment_method", "billing_email"],
    "nextBillingDate": "2026-05-01",
    "amount": "$299.00"
  }
}
```

---

### `ORG_COMPLIANCE_AUDIT_COMPLETED`
Sent when an org compliance audit is completed.

```json
{
  "to": "user@example.com",
  "templateId": "ORG_COMPLIANCE_AUDIT_COMPLETED",
  "data": {
    "orgName": "Acme Corp",
    "orgId": "org_abc",
    "auditType": "SOC 2 Type II",
    "completedBy": "External Auditor",
    "completedAt": "2026-04-13T10:00:00Z",
    "status": "compliant",
    "findings": ["No critical issues", "2 minor recommendations"],
    "reportUrl": "https://app.com/compliance/report/audit_abc"
  }
}
```

---

## 4. Payments & Billing

### `PAYMENT_SUCCESS`
Sent when a payment is successfully processed.

```json
{
  "to": "user@example.com",
  "templateId": "PAYMENT_SUCCESS",
  "data": {
    "username": "Alice",
    "amount": "$49.99",
    "transactionId": "txn_abc123",
    "paymentMethod": "Visa ending 4242",
    "date": "2026-04-13T10:00:00Z"
  }
}
```

---

### `PAYMENT_FAILED`
Sent when a payment fails.

```json
{
  "to": "user@example.com",
  "templateId": "PAYMENT_FAILED",
  "data": {
    "username": "Alice",
    "amount": "$49.99",
    "transactionId": "txn_abc123",
    "paymentMethod": "Visa ending 4242",
    "date": "2026-04-13T10:00:00Z",
    "failureReason": "Insufficient funds"
  }
}
```

---

### `PAYMENT_PENDING`
Sent when a payment is pending confirmation.

```json
{
  "to": "user@example.com",
  "templateId": "PAYMENT_PENDING",
  "data": {
    "username": "Alice",
    "amount": "$49.99",
    "paymentMethod": "Bank Transfer",
    "expectedDate": "2026-04-15T00:00:00Z"
  }
}
```

---

### `PAYMENT_REFUNDED`
Sent when a payment is refunded.

```json
{
  "to": "user@example.com",
  "templateId": "PAYMENT_REFUNDED",
  "data": {
    "username": "Alice",
    "amount": "$49.99",
    "transactionId": "txn_abc123",
    "refundId": "ref_xyz",
    "refundDate": "2026-04-13T10:00:00Z"
  }
}
```

---

### `INVOICE_GENERATED`
Sent when a new invoice is generated.

```json
{
  "to": "user@example.com",
  "templateId": "INVOICE_GENERATED",
  "data": {
    "username": "Alice",
    "invoiceNumber": "INV-2026-001",
    "dueDate": "2026-05-01",
    "amount": "$299.00",
    "invoiceUrl": "https://app.com/invoices/INV-2026-001"
  }
}
```

---

### `INVOICE_PAID`
Sent when an invoice is paid.

```json
{
  "to": "user@example.com",
  "templateId": "INVOICE_PAID",
  "data": {
    "username": "Alice",
    "invoiceNumber": "INV-2026-001",
    "paymentDate": "2026-04-13",
    "amount": "$299.00"
  }
}
```

---

### `INVOICE_OVERDUE`
Sent when an invoice payment is overdue.

```json
{
  "to": "user@example.com",
  "templateId": "INVOICE_OVERDUE",
  "data": {
    "username": "Alice",
    "invoiceNumber": "INV-2026-001",
    "dueDate": "2026-04-01",
    "amount": "$299.00"
  }
}
```

---

### `INVOICE_CANCELLED`
Sent when an invoice is cancelled.

```json
{
  "to": "user@example.com",
  "templateId": "INVOICE_CANCELLED",
  "data": {
    "username": "Alice",
    "invoiceNumber": "INV-2026-001",
    "cancelledAt": "2026-04-13T10:00:00Z",
    "reason": "Order was cancelled"
  }
}
```

---

### `BILLING_INFO_UPDATED`
Sent when billing information is updated.

```json
{
  "to": "user@example.com",
  "templateId": "BILLING_INFO_UPDATED",
  "data": {
    "username": "Alice",
    "updatedFields": ["Card number", "Billing address"],
    "updatedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `CHARGEBACK_INITIATED`
Sent when a chargeback is submitted.

```json
{
  "to": "user@example.com",
  "templateId": "CHARGEBACK_INITIATED",
  "data": {
    "username": "Alice",
    "transactionId": "txn_abc123",
    "amount": "$49.99",
    "chargebackDate": "2026-04-13T10:00:00Z",
    "reason": "Item not as described"
  }
}
```

---

### `CHARGEBACK_RESOLVED`
Sent when a chargeback is resolved.

```json
{
  "to": "user@example.com",
  "templateId": "CHARGEBACK_RESOLVED",
  "data": {
    "username": "Alice",
    "transactionId": "txn_abc123",
    "amount": "$49.99",
    "resolutionDate": "2026-04-20T10:00:00Z",
    "outcome": "Resolved in merchant's favor"
  }
}
```

---

## 5. Subscriptions

### `AUTO_RENEWAL_REMINDER`
Reminder that a subscription will auto-renew.

```json
{
  "to": "user@example.com",
  "templateId": "AUTO_RENEWAL_REMINDER",
  "data": {
    "username": "Alice",
    "subscriptionName": "Pro Plan",
    "renewalDate": "2026-05-01",
    "amount": "$29.99"
  }
}
```

---

### `SUBSCRIPTION_STARTED`
Sent when a new subscription begins.

```json
{
  "to": "user@example.com",
  "templateId": "SUBSCRIPTION_STARTED",
  "data": {
    "username": "Alice",
    "subscriptionName": "Pro Plan",
    "startDate": "2026-04-13"
  }
}
```

---

### `SUBSCRIPTION_CANCELLED`
Sent when a subscription is cancelled.

```json
{
  "to": "user@example.com",
  "templateId": "SUBSCRIPTION_CANCELLED",
  "data": {
    "username": "Alice",
    "subscriptionName": "Pro Plan",
    "cancelledAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `SUBSCRIPTION_RENEWED`
Sent when a subscription is successfully renewed.

```json
{
  "to": "user@example.com",
  "templateId": "SUBSCRIPTION_RENEWED",
  "data": {
    "username": "Alice",
    "subscriptionName": "Pro Plan",
    "renewalDate": "2026-04-13",
    "amount": "$29.99"
  }
}
```

---

## 6. Cart & Wishlist

### `CART_CREATED`

```json
{
  "to": "user@example.com",
  "templateId": "CART_CREATED",
  "data": {
    "username": "Alice",
    "cartId": "cart_abc",
    "itemCount": 3,
    "createdAt": "2026-04-13T10:00:00Z"
  }
}
```

### `CART_UPDATED`

```json
{
  "to": "user@example.com",
  "templateId": "CART_UPDATED",
  "data": {
    "username": "Alice",
    "cartId": "cart_abc",
    "itemCount": 4,
    "totalAmount": "$125.00",
    "updatedAt": "2026-04-13T10:00:00Z"
  }
}
```

### `CART_ABANDONED`
Sent to recover an abandoned cart.

```json
{
  "to": "user@example.com",
  "templateId": "CART_ABANDONED",
  "data": {
    "username": "Alice",
    "cartId": "cart_abc",
    "itemCount": 3,
    "items": [
      { "name": "Blue T-Shirt", "price": "$25.00", "image": "https://cdn.example.com/shirt.jpg" }
    ],
    "totalAmount": "$75.00",
    "abandonedAt": "2026-04-13T10:00:00Z"
  }
}
```

### `CART_EXPIRY_NOTIFICATION`

```json
{
  "to": "user@example.com",
  "templateId": "CART_EXPIRY_NOTIFICATION",
  "data": {
    "username": "Alice",
    "cartId": "cart_abc",
    "itemCount": 3,
    "expiryDate": "2026-04-14T10:00:00Z",
    "hoursRemaining": 12
  }
}
```

### `CART_ITEM_PRICE_CHANGED`

```json
{
  "to": "user@example.com",
  "templateId": "CART_ITEM_PRICE_CHANGED",
  "data": {
    "username": "Alice",
    "cartId": "cart_abc",
    "productName": "Blue T-Shirt",
    "oldPrice": "$30.00",
    "newPrice": "$25.00",
    "priceChange": "-$5.00"
  }
}
```

---

### `WISHLIST_CREATED`

```json
{
  "to": "user@example.com",
  "templateId": "WISHLIST_CREATED",
  "data": {
    "username": "Alice",
    "wishlistId": "wl_abc",
    "itemCount": 5,
    "createdAt": "2026-04-13T10:00:00Z"
  }
}
```

### `WISHLIST_REMINDER`

```json
{
  "to": "user@example.com",
  "templateId": "WISHLIST_REMINDER",
  "data": {
    "username": "Alice",
    "wishlistId": "wl_abc",
    "itemCount": 5,
    "items": [{ "name": "Blue T-Shirt", "price": "$25.00" }]
  }
}
```

### `WISHLIST_PRICE_DROP`

```json
{
  "to": "user@example.com",
  "templateId": "WISHLIST_PRICE_DROP",
  "data": {
    "username": "Alice",
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "oldPrice": "$30.00",
    "newPrice": "$22.00",
    "savings": "$8.00",
    "productImage": "https://cdn.example.com/shirt.jpg",
    "productUrl": "https://shop.com/products/shirt"
  }
}
```

### `WISHLIST_BACK_IN_STOCK`

```json
{
  "to": "user@example.com",
  "templateId": "WISHLIST_BACK_IN_STOCK",
  "data": {
    "username": "Alice",
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "productImage": "https://cdn.example.com/shirt.jpg",
    "productUrl": "https://shop.com/products/shirt"
  }
}
```

---

## 7. Orders

### `ORDER_CREATED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_CREATED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "orderDate": "2026-04-13T10:00:00Z",
    "items": [
      { "name": "Blue T-Shirt", "quantity": 2, "price": "$25.00" }
    ],
    "totalAmount": "$50.00",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "US"
    }
  }
}
```

### `ORDER_CONFIRMED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_CONFIRMED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "estimatedDelivery": "2026-04-18",
    "totalAmount": "$50.00"
  }
}
```

### `ORDER_SHIPPED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_SHIPPED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "UPS",
    "estimatedDelivery": "2026-04-18",
    "trackingUrl": "https://ups.com/track?num=1Z999AA10123456784"
  }
}
```

### `ORDER_DELIVERED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_DELIVERED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "deliveryDate": "2026-04-17T14:30:00Z",
    "deliveryAddress": "123 Main St, New York, NY 10001"
  }
}
```

### `ORDER_DELAYED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_DELAYED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "reason": "Weather conditions",
    "newEstimatedDelivery": "2026-04-20"
  }
}
```

### `ORDER_CANCELLED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_CANCELLED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "cancelledBy": "customer",
    "reason": "Changed my mind",
    "refundAmount": "$50.00",
    "cancelledAt": "2026-04-13T10:00:00Z"
  }
}
```

### `ORDER_REFUNDED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_REFUNDED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "refundAmount": "$50.00",
    "refundMethod": "Original payment method",
    "refundDate": "2026-04-14T10:00:00Z",
    "transactionId": "ref_xyz"
  }
}
```

### `ORDER_PAYMENT_PENDING`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_PAYMENT_PENDING",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "amount": "$50.00",
    "paymentMethod": "Bank Transfer"
  }
}
```

### `ORDER_PAYMENT_FAILED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_PAYMENT_FAILED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "amount": "$50.00",
    "paymentMethod": "Visa ending 4242",
    "failureReason": "Card declined"
  }
}
```

### `ORDER_PARTIALLY_SHIPPED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_PARTIALLY_SHIPPED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "shippedItems": [{ "name": "Blue T-Shirt", "quantity": 1 }],
    "remainingItems": [{ "name": "Red Hoodie", "quantity": 1 }],
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "UPS"
  }
}
```

### `CUSTOM_ORDER_CONFIRMED`

```json
{
  "to": "user@example.com",
  "templateId": "CUSTOM_ORDER_CONFIRMED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "customDetails": "Engraved with: Alice S.",
    "estimatedCompletion": "2026-04-25",
    "totalAmount": "$89.99"
  }
}
```

### `ORDER_REVIEWED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_REVIEWED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "rating": 5,
    "reviewText": "Amazing product, fast shipping!"
  }
}
```

---

## 8. Returns & Exchanges

### `RETURN_REQUEST_RECEIVED`

```json
{
  "to": "user@example.com",
  "templateId": "RETURN_REQUEST_RECEIVED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "returnId": "RET-001",
    "requestedItems": [{ "name": "Blue T-Shirt", "quantity": 1 }],
    "returnReason": "Wrong size",
    "requestDate": "2026-04-13T10:00:00Z"
  }
}
```

### `RETURN_APPROVED`

```json
{
  "to": "user@example.com",
  "templateId": "RETURN_APPROVED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "returnId": "RET-001",
    "approvedItems": [{ "name": "Blue T-Shirt", "quantity": 1 }],
    "returnLabel": "https://shipping.com/label/ret001",
    "returnInstructions": "Package the item and drop off at any UPS location."
  }
}
```

### `RETURN_REJECTED`

```json
{
  "to": "user@example.com",
  "templateId": "RETURN_REJECTED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "returnId": "RET-001",
    "rejectionReason": "Item returned outside return window"
  }
}
```

### `RETURN_COMPLETED`

```json
{
  "to": "user@example.com",
  "templateId": "RETURN_COMPLETED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "returnId": "RET-001",
    "refundAmount": "$25.00",
    "refundMethod": "Original payment method",
    "completionDate": "2026-04-20T10:00:00Z"
  }
}
```

### `EXCHANGE_REQUESTED`

```json
{
  "to": "user@example.com",
  "templateId": "EXCHANGE_REQUESTED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "exchangeId": "EXC-001",
    "originalItem": "Blue T-Shirt (Medium)",
    "requestedItem": "Blue T-Shirt (Large)",
    "requestDate": "2026-04-13T10:00:00Z"
  }
}
```

### `EXCHANGE_APPROVED`

```json
{
  "to": "user@example.com",
  "templateId": "EXCHANGE_APPROVED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "exchangeId": "EXC-001",
    "originalItem": "Blue T-Shirt (Medium)",
    "newItem": "Blue T-Shirt (Large)",
    "returnLabel": "https://shipping.com/label/exc001"
  }
}
```

### `EXCHANGE_REJECTED`

```json
{
  "to": "user@example.com",
  "templateId": "EXCHANGE_REJECTED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "exchangeId": "EXC-001",
    "rejectionReason": "Requested size not available"
  }
}
```

---

## 9. Shipping & Delivery

### `PACKAGE_DISPATCHED`

```json
{
  "to": "user@example.com",
  "templateId": "PACKAGE_DISPATCHED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "items": [{ "name": "Blue T-Shirt", "quantity": 1 }],
    "dispatchedAt": "2026-04-14T08:00:00Z"
  }
}
```

### `PACKAGE_IN_TRANSIT`

```json
{
  "to": "user@example.com",
  "templateId": "PACKAGE_IN_TRANSIT",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "currentLocation": "Chicago, IL",
    "estimatedDelivery": "2026-04-17",
    "carrier": "UPS"
  }
}
```

### `PACKAGE_OUT_FOR_DELIVERY`

```json
{
  "to": "user@example.com",
  "templateId": "PACKAGE_OUT_FOR_DELIVERY",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "estimatedDelivery": "Today by 8pm",
    "deliveryAddress": "123 Main St, New York, NY 10001"
  }
}
```

### `PACKAGE_DELIVERED`

```json
{
  "to": "user@example.com",
  "templateId": "PACKAGE_DELIVERED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "deliveredAt": "2026-04-17T14:30:00Z",
    "signedBy": "A. Smith",
    "deliveryAddress": "123 Main St, New York, NY 10001"
  }
}
```

### `PACKAGE_DELAYED`

```json
{
  "to": "user@example.com",
  "templateId": "PACKAGE_DELAYED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "originalDelivery": "2026-04-17",
    "newDelivery": "2026-04-20",
    "reason": "Severe weather delay"
  }
}
```

### `PACKAGE_LOST`

```json
{
  "to": "user@example.com",
  "templateId": "PACKAGE_LOST",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "lastLocation": "Memphis, TN",
    "reportedAt": "2026-04-18T10:00:00Z"
  }
}
```

### `DELIVERY_EXCEPTION`

```json
{
  "to": "user@example.com",
  "templateId": "DELIVERY_EXCEPTION",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "exceptionType": "Address not found",
    "details": "The delivery address could not be located by the carrier.",
    "nextStep": "Please contact the carrier to reschedule delivery."
  }
}
```

### `CUSTOMS_HOLD`

```json
{
  "to": "user@example.com",
  "templateId": "CUSTOMS_HOLD",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "trackingNumber": "1Z999AA10123456784",
    "holdReason": "Additional customs documentation required",
    "estimatedClearing": "2026-04-22",
    "requiredActions": ["Submit customs form CN22", "Provide proof of purchase"]
  }
}
```

---

## 10. Products & Inventory

### `PRODUCT_CREATED`

```json
{
  "to": "user@example.com",
  "templateId": "PRODUCT_CREATED",
  "data": {
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "sku": "BTS-M-001",
    "category": "Clothing",
    "pricing": { "price": 25.00, "currency": "USD" },
    "createdAt": "2026-04-13T10:00:00Z",
    "createdBy": "alice@store.com"
  }
}
```

### `PRODUCT_UPDATED`

```json
{
  "to": "user@example.com",
  "templateId": "PRODUCT_UPDATED",
  "data": {
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "updatedFields": ["price", "description"],
    "updatedBy": "alice@store.com",
    "updatedAt": "2026-04-13T10:00:00Z"
  }
}
```

### `PRODUCT_DELETED`

```json
{
  "to": "user@example.com",
  "templateId": "PRODUCT_DELETED",
  "data": {
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "deletedBy": "alice@store.com",
    "reason": "Discontinued",
    "deletedAt": "2026-04-13T10:00:00Z"
  }
}
```

### `PRODUCT_OUT_OF_STOCK`

```json
{
  "to": "user@example.com",
  "templateId": "PRODUCT_OUT_OF_STOCK",
  "data": {
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "lastInStock": "2026-04-10T12:00:00Z",
    "expectedRestock": "2026-04-25"
  }
}
```

### `PRODUCT_BACK_IN_STOCK`

```json
{
  "to": "user@example.com",
  "templateId": "PRODUCT_BACK_IN_STOCK",
  "data": {
    "username": "Alice",
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "quantityRestocked": 50,
    "restockDate": "2026-04-13",
    "productUrl": "https://shop.com/products/prod_abc"
  }
}
```

### `STOCK_LOW`

```json
{
  "to": "user@example.com",
  "templateId": "STOCK_LOW",
  "data": {
    "productName": "Blue T-Shirt",
    "currentStock": 5,
    "minimumThreshold": 10,
    "recommendedAction": "Reorder immediately",
    "productId": "prod_abc"
  }
}
```

### `STOCK_CRITICAL`

```json
{
  "to": "user@example.com",
  "templateId": "STOCK_CRITICAL",
  "data": {
    "productName": "Blue T-Shirt",
    "currentStock": 1,
    "criticalThreshold": 3,
    "urgentAction": "Emergency reorder required",
    "productId": "prod_abc"
  }
}
```

### `STOCK_REPLENISHED`

```json
{
  "to": "user@example.com",
  "templateId": "STOCK_REPLENISHED",
  "data": {
    "productName": "Blue T-Shirt",
    "quantityAdded": 100,
    "newStock": 105,
    "supplier": "Textile Co.",
    "expectedDelivery": "2026-04-20",
    "productId": "prod_abc"
  }
}
```

### `INVENTORY_AUDIT_COMPLETED`

```json
{
  "to": "user@example.com",
  "templateId": "INVENTORY_AUDIT_COMPLETED",
  "data": {
    "auditType": "Full Stock Count",
    "completedAt": "2026-04-13T18:00:00Z",
    "discrepancies": 3,
    "variance": "-$45.00",
    "actionItems": ["Investigate SKU BTS-M-001", "Update records for SKU RED-L-002"]
  }
}
```

### `SUPPLIER_DELAY`

```json
{
  "to": "user@example.com",
  "templateId": "SUPPLIER_DELAY",
  "data": {
    "supplierName": "Textile Co.",
    "orderId": "PO-2026-045",
    "originalDelivery": "2026-04-15",
    "newDelivery": "2026-04-25",
    "affectedProducts": ["Blue T-Shirt", "Red Hoodie"],
    "reason": "Factory supply chain disruption"
  }
}
```

### `BATCH_EXPIRING_SOON`

```json
{
  "to": "user@example.com",
  "templateId": "BATCH_EXPIRING_SOON",
  "data": {
    "productName": "Hand Sanitizer",
    "batchNumber": "BATCH-2024-001",
    "expiryDate": "2026-05-01",
    "daysRemaining": 18,
    "currentStock": 200,
    "recommendation": "Apply discount to clear stock"
  }
}
```

### `WAREHOUSE_TRANSFER_INITIATED`

```json
{
  "to": "user@example.com",
  "templateId": "WAREHOUSE_TRANSFER_INITIATED",
  "data": {
    "transferId": "TRF-001",
    "fromWarehouse": "NYC-01",
    "toWarehouse": "LAX-02",
    "items": [{ "name": "Blue T-Shirt", "quantity": 50 }],
    "initiatedBy": "warehouse@store.com",
    "estimatedArrival": "2026-04-18"
  }
}
```

---

## 11. System & Infrastructure

### `SYSTEM_ALERT`

```json
{
  "to": "user@example.com",
  "templateId": "SYSTEM_ALERT",
  "data": {
    "alertType": "High CPU Usage",
    "severity": "critical",
    "message": "CPU usage has exceeded 95% for 5 minutes.",
    "affectedServices": ["API Gateway", "Email Service"],
    "detectedAt": "2026-04-13T10:00:00Z",
    "actionRequired": "Scale up the API service immediately."
  }
}
```

### `MAINTENANCE_SCHEDULED`

```json
{
  "to": "user@example.com",
  "templateId": "MAINTENANCE_SCHEDULED",
  "data": {
    "maintenanceType": "Database Migration",
    "scheduledStart": "2026-04-20T02:00:00Z",
    "scheduledEnd": "2026-04-20T04:00:00Z",
    "duration": "2 hours",
    "affectedServices": ["API", "Dashboard"],
    "impact": "Service will be unavailable",
    "reason": "Schema upgrade for performance improvements"
  }
}
```

### `MAINTENANCE_STARTED`

```json
{
  "to": "user@example.com",
  "templateId": "MAINTENANCE_STARTED",
  "data": {
    "maintenanceType": "Database Migration",
    "startedAt": "2026-04-20T02:05:00Z",
    "estimatedEnd": "2026-04-20T04:00:00Z",
    "affectedServices": ["API", "Dashboard"]
  }
}
```

### `MAINTENANCE_COMPLETED`

```json
{
  "to": "user@example.com",
  "templateId": "MAINTENANCE_COMPLETED",
  "data": {
    "maintenanceType": "Database Migration",
    "completedAt": "2026-04-20T03:45:00Z",
    "duration": "1 hour 40 minutes",
    "improvements": ["30% faster query response", "Improved indexing"]
  }
}
```

### `DATA_BACKUP_COMPLETED`

```json
{
  "to": "user@example.com",
  "templateId": "DATA_BACKUP_COMPLETED",
  "data": {
    "backupType": "Full Database Backup",
    "completedAt": "2026-04-13T03:00:00Z",
    "backupSize": "45.2 GB",
    "status": "success",
    "nextScheduledBackup": "2026-04-14T03:00:00Z"
  }
}
```

### `DEPLOYMENT_STARTED`

```json
{
  "to": "user@example.com",
  "templateId": "DEPLOYMENT_STARTED",
  "data": {
    "serviceName": "email-microservice",
    "version": "2.1.0",
    "environment": "production",
    "startedBy": "CI/CD Pipeline",
    "startedAt": "2026-04-13T10:00:00Z"
  }
}
```

### `DEPLOYMENT_COMPLETED`

```json
{
  "to": "user@example.com",
  "templateId": "DEPLOYMENT_COMPLETED",
  "data": {
    "serviceName": "email-microservice",
    "version": "2.1.0",
    "environment": "production",
    "completedAt": "2026-04-13T10:05:00Z",
    "duration": "5 minutes"
  }
}
```

### `DEPLOYMENT_FAILED`

```json
{
  "to": "user@example.com",
  "templateId": "DEPLOYMENT_FAILED",
  "data": {
    "serviceName": "email-microservice",
    "version": "2.1.0",
    "environment": "production",
    "failedAt": "2026-04-13T10:03:00Z",
    "errorMessage": "Health check failed after deployment",
    "rollbackStatus": "Rolled back to v2.0.9"
  }
}
```

### `SERVICE_OUTAGE_DETECTED`

```json
{
  "to": "user@example.com",
  "templateId": "SERVICE_OUTAGE_DETECTED",
  "data": {
    "serviceName": "Payment Gateway",
    "detectedAt": "2026-04-13T10:00:00Z",
    "affectedUsers": 1200,
    "errorDetails": "503 errors from payment API",
    "estimatedResolution": "2026-04-13T11:00:00Z"
  }
}
```

### `SERVICE_RECOVERED`

```json
{
  "to": "user@example.com",
  "templateId": "SERVICE_RECOVERED",
  "data": {
    "serviceName": "Payment Gateway",
    "recoveredAt": "2026-04-13T10:45:00Z",
    "outageDuration": "45 minutes",
    "rootCause": "Database connection pool exhaustion",
    "preventiveMeasures": ["Increased connection pool size", "Added circuit breaker"]
  }
}
```

### `NEW_FEATURE_RELEASED`

```json
{
  "to": "user@example.com",
  "templateId": "NEW_FEATURE_RELEASED",
  "data": {
    "featureName": "Dark Mode",
    "releaseDate": "2026-04-15",
    "description": "Toggle between light and dark theme in settings.",
    "benefits": ["Reduced eye strain", "Lower battery usage on OLED screens"],
    "learnMoreUrl": "https://app.com/blog/dark-mode"
  }
}
```

---

## 12. Marketing & Promotions

### `PROMOTION_LAUNCHED`

```json
{
  "to": "user@example.com",
  "templateId": "PROMOTION_LAUNCHED",
  "data": {
    "username": "Alice",
    "promotionName": "Summer Sale 2026",
    "description": "Up to 50% off summer essentials",
    "discountPercentage": 50,
    "validFrom": "2026-06-01",
    "validTo": "2026-06-30",
    "exclusions": "Sale items not included",
    "promoCode": "SUMMER50"
  }
}
```

### `DISCOUNT_APPLIED`

```json
{
  "to": "user@example.com",
  "templateId": "DISCOUNT_APPLIED",
  "data": {
    "username": "Alice",
    "discountAmount": "$15.00",
    "discountType": "Coupon code: SAVE15",
    "expiryDate": "2026-04-30",
    "terms": "One use per customer"
  }
}
```

### `FLASH_SALE_ANNOUNCEMENT`

```json
{
  "to": "user@example.com",
  "templateId": "FLASH_SALE_ANNOUNCEMENT",
  "data": {
    "saleName": "48-Hour Flash Sale",
    "startsAt": "2026-04-14T00:00:00Z",
    "endsAt": "2026-04-16T00:00:00Z",
    "featured": ["Laptops", "Headphones", "Wearables"],
    "discount": "Up to 60% off",
    "urgency": "Ends in 48 hours!"
  }
}
```

### `LOYALTY_POINTS_EARNED`

```json
{
  "to": "user@example.com",
  "templateId": "LOYALTY_POINTS_EARNED",
  "data": {
    "username": "Alice",
    "pointsEarned": 150,
    "totalPoints": 2340,
    "reason": "Purchase ORD-001",
    "redeemValue": "$2.34"
  }
}
```

### `LOYALTY_POINTS_REDEEMED`

```json
{
  "to": "user@example.com",
  "templateId": "LOYALTY_POINTS_REDEEMED",
  "data": {
    "username": "Alice",
    "pointsRedeemed": 1000,
    "remainingPoints": 1340,
    "redemptionValue": "$10.00",
    "rewardDescription": "Discount on next order"
  }
}
```

### `NEW_PRODUCT_LAUNCH`

```json
{
  "to": "user@example.com",
  "templateId": "NEW_PRODUCT_LAUNCH",
  "data": {
    "username": "Alice",
    "productName": "AirMax X1 Headphones",
    "productImage": "https://cdn.example.com/airmax.jpg",
    "description": "Premium noise-cancelling headphones with 40h battery life.",
    "launchDate": "2026-05-01",
    "specialOffer": "20% launch discount — first 100 orders"
  }
}
```

### `CUSTOMER_MILESTONE`

```json
{
  "to": "user@example.com",
  "templateId": "CUSTOMER_MILESTONE",
  "data": {
    "username": "Alice",
    "milestoneType": "1 Year Anniversary",
    "milestoneValue": "365 days",
    "bonus": "Free shipping for 30 days",
    "celebrationMessage": "Thank you for being with us for a whole year!"
  }
}
```

### `REVIEW_REMINDER`

```json
{
  "to": "user@example.com",
  "templateId": "REVIEW_REMINDER",
  "data": {
    "username": "Alice",
    "productName": "Blue T-Shirt",
    "orderId": "ORD-001",
    "purchaseDate": "2026-04-01"
  }
}
```

### `EVENT_INVITATION`

```json
{
  "to": "user@example.com",
  "templateId": "EVENT_INVITATION",
  "data": {
    "username": "Alice",
    "eventName": "Product Launch Webinar",
    "eventDate": "2026-05-10",
    "eventTime": "3:00 PM EST",
    "location": "Online (Zoom)",
    "description": "Join us for the live launch of our new product line.",
    "rsvpUrl": "https://app.com/events/rsvp/webinar-001"
  }
}
```

### `HOLIDAY_GREETINGS`

```json
{
  "to": "user@example.com",
  "templateId": "HOLIDAY_GREETINGS",
  "data": {
    "username": "Alice",
    "holidayName": "Christmas",
    "greeting": "Wishing you joy and peace this festive season!",
    "specialOffer": "25% off with code XMAS25",
    "endDate": "2026-12-31"
  }
}
```

---

## 13. Notifications & Messaging

### `MESSAGE_RECEIVED`

```json
{
  "to": "user@example.com",
  "templateId": "MESSAGE_RECEIVED",
  "data": {
    "recipientName": "Alice",
    "senderName": "Bob Jones",
    "messagePreview": "Hey Alice, just checking in...",
    "receivedAt": "2026-04-13T10:00:00Z",
    "replyUrl": "https://app.com/messages/msg_abc"
  }
}
```

### `COMMENT_POSTED`

```json
{
  "to": "user@example.com",
  "templateId": "COMMENT_POSTED",
  "data": {
    "username": "Alice",
    "commenterName": "Bob Jones",
    "contentType": "post",
    "commentPreview": "Great article! I especially liked...",
    "postedAt": "2026-04-13T10:00:00Z",
    "commentUrl": "https://app.com/posts/123#comment-456"
  }
}
```

### `MENTION_RECEIVED`

```json
{
  "to": "user@example.com",
  "templateId": "MENTION_RECEIVED",
  "data": {
    "username": "alice_smith",
    "mentionedBy": "bob_jones",
    "context": "project-alpha",
    "contextType": "task",
    "contentPreview": "@alice_smith can you review this PR?",
    "mentionUrl": "https://app.com/tasks/task_abc"
  }
}
```

### `CHAT_STARTED`

```json
{
  "to": "user@example.com",
  "templateId": "CHAT_STARTED",
  "data": {
    "username": "Alice",
    "chatInitiator": "Support Agent Bob",
    "topic": "Order Inquiry",
    "chatId": "chat_abc",
    "startedAt": "2026-04-13T10:00:00Z",
    "joinUrl": "https://app.com/chat/chat_abc"
  }
}
```

---

## 14. Analytics & Reports

### `DAILY_REPORT_READY`

```json
{
  "to": "user@example.com",
  "templateId": "DAILY_REPORT_READY",
  "data": {
    "username": "Alice",
    "reportDate": "2026-04-12",
    "metrics": {
      "revenue": "$4,250",
      "orders": 47,
      "newUsers": 12
    },
    "highlights": "Revenue up 15% vs yesterday",
    "reportUrl": "https://app.com/reports/daily/2026-04-12"
  }
}
```

### `WEEKLY_REPORT_READY`

```json
{
  "to": "user@example.com",
  "templateId": "WEEKLY_REPORT_READY",
  "data": {
    "username": "Alice",
    "weekStart": "2026-04-07",
    "weekEnd": "2026-04-13",
    "metrics": { "revenue": "$28,500", "orders": 312 },
    "topPerformer": "Blue T-Shirt",
    "keyInsights": "Weekend sales up 22%",
    "reportUrl": "https://app.com/reports/weekly/2026-W15"
  }
}
```

### `DATA_TREND_ALERT`

```json
{
  "to": "user@example.com",
  "templateId": "DATA_TREND_ALERT",
  "data": {
    "username": "Alice",
    "trendType": "spike",
    "metric": "Daily Active Users",
    "change": "+450",
    "percentageChange": "+38%",
    "period": "Last 24 hours",
    "recommendation": "Review marketing campaigns driving this spike"
  }
}
```

### `KPI_THRESHOLD_BREACHED`

```json
{
  "to": "user@example.com",
  "templateId": "KPI_THRESHOLD_BREACHED",
  "data": {
    "username": "Alice",
    "kpiName": "Order Fulfillment Rate",
    "currentValue": "87%",
    "threshold": "95%",
    "direction": "below",
    "severity": "warning",
    "recommendations": ["Review warehouse capacity", "Check carrier SLAs"]
  }
}
```

---

## 15. Leads & CRM

### `LEAD_RECEIVED`
Confirmation email to the lead.

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_RECEIVED",
  "data": {
    "firstName": "Bob",
    "lastName": "Customer",
    "leadNumber": "LEAD-2026-001",
    "subject": "Website Redesign",
    "projectType": "Web Application",
    "budget": "$15,000",
    "timeline": "2 months",
    "companyName": "Acme Corp",
    "supportEmail": "hello@acme.com",
    "baseUrl": "https://acme.com"
  }
}
```

### `LEAD_ADMIN_NOTIFICATION`
Internal notification of a new lead for the sales team.

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_ADMIN_NOTIFICATION",
  "data": {
    "leadNumber": "LEAD-2026-001",
    "firstName": "Bob",
    "lastName": "Customer",
    "email": "bob@example.com",
    "phone": "+1-555-0101",
    "company": "ACME Ltd",
    "subject": "Website Redesign",
    "message": "Looking for a full redesign of our corporate website...",
    "projectType": "Web Application",
    "budget": "$15,000",
    "timeline": "2 months",
    "source": "Website Contact Form",
    "priority": "high",
    "score": 85,
    "ipAddress": "203.0.113.5",
    "submittedAt": "2026-04-13T10:00:00Z",
    "reviewUrl": "https://crm.acme.com/leads/LEAD-2026-001",
    "assignedTo": "Sales Team"
  }
}
```

### `LEAD_CONTACT_REPLY`
Reply from sales agent to a lead.

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_CONTACT_REPLY",
  "data": {
    "firstName": "Bob",
    "lastName": "Customer",
    "leadNumber": "LEAD-2026-001",
    "subject": "Website Redesign",
    "message": "Thank you for your inquiry. We'd love to set up a call...",
    "agentName": "Alice Smith",
    "agentEmail": "alice@acme.com",
    "agentTitle": "Sales Manager",
    "companyName": "Acme Corp",
    "replyUrl": "https://acme.com/leads/LEAD-2026-001/reply"
  }
}
```

### `LEAD_STATUS_CHANGED`

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_STATUS_CHANGED",
  "data": {
    "firstName": "Bob",
    "lastName": "Customer",
    "leadNumber": "LEAD-2026-001",
    "oldStatus": "New",
    "newStatus": "In Progress",
    "note": "Discovery call scheduled for April 15",
    "agentName": "Alice Smith",
    "companyName": "Acme Corp",
    "ctaUrl": "https://crm.acme.com/leads/LEAD-2026-001",
    "ctaText": "View Lead"
  }
}
```

### `LEAD_FOLLOW_UP_REMINDER`

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_FOLLOW_UP_REMINDER",
  "data": {
    "agentName": "Alice Smith",
    "leadNumber": "LEAD-2026-001",
    "leadFirstName": "Bob",
    "leadLastName": "Customer",
    "leadEmail": "bob@example.com",
    "leadCompany": "ACME Ltd",
    "priority": "high",
    "followUpDate": "2026-04-15",
    "daysSinceLastContact": 5,
    "notes": "Interested in redesign, waiting for budget approval",
    "reviewUrl": "https://crm.acme.com/leads/LEAD-2026-001"
  }
}
```

### `PROJECT_PROPOSAL_EMAIL`
Sends a project proposal to a client.

```json
{
  "to": "user@example.com",
  "templateId": "PROJECT_PROPOSAL_EMAIL",
  "data": {
    "clientName": "Bob Customer",
    "projectName": "Website Redesign",
    "proposalUrl": "https://acme.com/proposals/PROP-001.pdf",
    "proposalNumber": "PROP-2026-001",
    "issueDate": "2026-04-13",
    "validUntil": "2026-04-27",
    "companyName": "Acme Corp",
    "contactEmail": "alice@acme.com",
    "contactPhone": "+1-555-0200",
    "attachmentName": "PROP-2026-001.pdf",
    "message": "Please find our proposal attached. We'd be happy to discuss any questions.",
    "baseUrl": "https://acme.com"
  }
}
```

### `LEAD_PROPOSAL_ACCEPTED`

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_PROPOSAL_ACCEPTED",
  "data": {
    "firstName": "Bob",
    "leadNumber": "LEAD-2026-001",
    "projectName": "Website Redesign",
    "quotedAmount": "15000",
    "quotedCurrency": "USD",
    "agentName": "Alice Smith",
    "nextStep": "We'll send the contract within 24 hours",
    "companyName": "Acme Corp"
  }
}
```

### `LEAD_PROPOSAL_DECLINED_ACK`

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_PROPOSAL_DECLINED_ACK",
  "data": {
    "firstName": "Bob",
    "leadNumber": "LEAD-2026-001",
    "projectName": "Website Redesign",
    "agentName": "Alice Smith",
    "companyName": "Acme Corp",
    "supportEmail": "hello@acme.com"
  }
}
```

### `LEAD_PROPOSAL_EXPIRING`

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_PROPOSAL_EXPIRING",
  "data": {
    "leadNumber": "LEAD-2026-001",
    "firstName": "Bob",
    "lastName": "Customer",
    "email": "bob@example.com",
    "proposalNumber": "PROP-2026-001",
    "validUntil": "2026-04-27",
    "daysRemaining": 3,
    "reviewUrl": "https://crm.acme.com/proposals/PROP-2026-001"
  }
}
```

### `LEAD_CONTRACT_SENT`

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_CONTRACT_SENT",
  "data": {
    "firstName": "Bob",
    "leadNumber": "LEAD-2026-001",
    "projectName": "Website Redesign",
    "contractUrl": "https://sign.acme.com/contracts/CTR-001",
    "agentName": "Alice Smith",
    "companyName": "Acme Corp",
    "message": "Please review and sign the contract at your earliest convenience."
  }
}
```

### `LEAD_CONTRACT_SIGNED`

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_CONTRACT_SIGNED",
  "data": {
    "firstName": "Bob",
    "leadNumber": "LEAD-2026-001",
    "projectName": "Website Redesign",
    "contractSignedAt": "2026-04-13T14:30:00Z",
    "agentName": "Alice Smith",
    "companyName": "Acme Corp"
  }
}
```

### `LEAD_WON_NOTIFICATION`
Internal notification when a deal is won.

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_WON_NOTIFICATION",
  "data": {
    "leadNumber": "LEAD-2026-001",
    "firstName": "Bob",
    "lastName": "Customer",
    "email": "bob@example.com",
    "company": "ACME Ltd",
    "projectName": "Website Redesign",
    "quotedAmount": "15000",
    "quotedCurrency": "USD",
    "closedAt": "2026-04-13T14:30:00Z",
    "agentName": "Alice Smith",
    "reviewUrl": "https://crm.acme.com/leads/LEAD-2026-001"
  }
}
```

### `LEAD_LOST_NOTIFICATION`
Internal notification when a deal is lost.

```json
{
  "to": "user@example.com",
  "templateId": "LEAD_LOST_NOTIFICATION",
  "data": {
    "leadNumber": "LEAD-2026-001",
    "firstName": "Bob",
    "lastName": "Customer",
    "email": "bob@example.com",
    "company": "ACME Ltd",
    "lostReason": "Budget constraints",
    "agentName": "Alice Smith",
    "reviewUrl": "https://crm.acme.com/leads/LEAD-2026-001"
  }
}
```

---

## 16. Marketplace

### `MARKETPLACE_WELCOME`

```json
{
  "to": "user@example.com",
  "templateId": "MARKETPLACE_WELCOME",
  "data": {
    "name": "Jane Provider",
    "email": "jane@example.com",
    "dashboardUrl": "https://marketplace.com/dashboard"
  }
}
```

### `MARKETPLACE_EMAIL_VERIFICATION`

```json
{
  "to": "user@example.com",
  "templateId": "MARKETPLACE_EMAIL_VERIFICATION",
  "data": {
    "name": "Jane",
    "verificationLink": "https://marketplace.com/verify?token=abc123"
  }
}
```

### `MARKETPLACE_PASSWORD_RESET`

```json
{
  "to": "user@example.com",
  "templateId": "MARKETPLACE_PASSWORD_RESET",
  "data": {
    "name": "Jane",
    "resetLink": "https://marketplace.com/reset-password?token=xyz789"
  }
}
```

### `MARKETPLACE_NEW_REQUEST`
Notifies a service provider of a new customer request.

```json
{
  "to": "user@example.com",
  "templateId": "MARKETPLACE_NEW_REQUEST",
  "data": {
    "providerName": "Jane Provider",
    "requestTitle": "Need plumbing service",
    "category": "Home Services",
    "budget": 150,
    "customerName": "Bob Customer",
    "requestDisplayId": "REQ-12345",
    "requestUrl": "https://marketplace.com/requests/12345"
  }
}
```

### `MARKETPLACE_PROPOSAL_RECEIVED`
Notifies a customer that a proposal has been submitted.

```json
{
  "to": "user@example.com",
  "templateId": "MARKETPLACE_PROPOSAL_RECEIVED",
  "data": {
    "customerName": "Bob Customer",
    "providerName": "Jane Provider",
    "requestTitle": "Need plumbing service",
    "price": 120,
    "estimatedDuration": "2-3 hours",
    "proposalDisplayId": "PROP-789",
    "requestDisplayId": "REQ-12345",
    "proposalUrl": "https://marketplace.com/proposals/789"
  }
}
```

### `MARKETPLACE_JOB_ASSIGNED`
Notifies provider that their proposal was accepted.

```json
{
  "to": "user@example.com",
  "templateId": "MARKETPLACE_JOB_ASSIGNED",
  "data": {
    "providerName": "Jane Provider",
    "requestTitle": "Need plumbing service",
    "customerName": "Bob Customer",
    "price": 120,
    "startDate": "2026-04-16",
    "jobDisplayId": "JOB-456",
    "jobUrl": "https://marketplace.com/jobs/456"
  }
}
```

### `MARKETPLACE_PAYMENT_RECEIVED`
Notifies provider that payment was received.

```json
{
  "to": "user@example.com",
  "templateId": "MARKETPLACE_PAYMENT_RECEIVED",
  "data": {
    "providerName": "Jane Provider",
    "amount": 120,
    "jobTitle": "Plumbing Service",
    "customerName": "Bob Customer",
    "paymentDisplayId": "PAY-999",
    "dashboardUrl": "https://marketplace.com/dashboard"
  }
}
```

---

## 17. Legacy Templates

These camelCase templates pre-date the uppercase naming convention. They still work but prefer the uppercase equivalents where available.

| Template ID | Purpose | Key `data` fields |
|-------------|---------|-------------------|
| `otpEmailTemplate` | OTP / verification code | `name`, `username`, `otp`, `purpose`, `expiryMinutes` |
| `emailVerificationTemplate` | Email verification link | `name`, `username`, `verifyLink`, `expiryHours` |
| `passwordResetRequestTemplate` | Password reset link | `resetToken`, `username` |
| `passwordResetSuccessTemplate` | Password reset success | `username` |
| `passwordChangedSuccessTemplate` | Password changed | `username` |
| `accountLockedTemplate` | Account locked | `username`, `unlockLink` |
| `suspiciousLoginTemplate` | Suspicious login alert | `username`, `location`, `device`, `resetLink` |
| `accountDeletedTemplate` | Account deleted | `username` |
| `logoutAllDevicesTemplate` | Logged out of all devices | `name`, `username`, `timestamp` |
| `newDeviceLoginTemplate` | New device sign-in | `username`, `location`, `device` |
| `twoFactorSetupTemplate` | MFA setup instructions | `name`, `username`, `qrCodeUrl`, `setupLink`, `secret` |
| `twoFactorCodeTemplate` | MFA one-time code | `username`, `code` |
| `backupCodesTemplate` | MFA backup codes | `name`, `username`, `codes` |
| `orderConfirmationTemplate` | Order confirmation | `username`, `orderId`, `items`, `total` |
| `orderShippedTemplate` | Order shipped | `username`, `orderId`, `trackingLink` |
| `orderDeliveredTemplate` | Order delivered | `username`, `orderId` |
| `paymentSuccessTemplate` | Payment success | `username`, `amount`, `invoiceLink` |
| `paymentFailedTemplate` | Payment failed | `username`, `amount`, `retryLink` |
| `invoiceGeneratedTemplate` | Invoice generated | `username`, `invoiceNumber`, `amount`, `invoiceLink` |
| `subscriptionUpdatedTemplate` | Subscription updated | `username`, `plan` |
| `subscriptionRenewalReminderTemplate` | Renewal reminder | `username`, `plan`, `renewalDate` |
| `subscriptionCancelledTemplate` | Subscription cancelled | `username`, `plan` |
| `newsletterTemplate` | Newsletter / announcement | `title`, `content`, `ctaLink` |
| `birthdayGreetingTemplate` | Birthday greeting | `username`, `discountCode` |
| `giftCardReceivedTemplate` | Gift card received | `username`, `sender`, `amount`, `redeemCode` |
| `cartAbandonmentTemplate` | Cart abandonment | `username`, `items`, `checkoutLink` |
| `loyaltyPointsEarnedTemplate` | Loyalty points earned | `username`, `points` |
| `trialExpiringTemplate` | Trial expiring | `username`, `expiryDate`, `upgradeLink` |
| `trialExpiredTemplate` | Trial expired | `username`, `upgradeLink` |
| `maintenanceNoticeTemplate` | Maintenance notice | `username`, `startTime`, `endTime` |
| `newFeatureAnnouncementTemplate` | New feature | `username`, `featureName`, `featureLink` |
| `NEWSLETTER_WELCOME` | Newsletter welcome | `email`, `companyName`, `unsubscribeUrl` |

---

## Full Quick-Reference Table

| Template ID | Category | Required Fields |
|-------------|----------|----------------|
| `USER_CREATED` | Auth | `userId`, `username`, `email`, `timestamp` |
| `USER_WELCOME` | Auth | `userId`, `username`, `email`, `verifyLink`, `timestamp` |
| `ADMIN_USER_REGISTERED` | Auth | `userId`, `username`, `email`, `registeredAt`, `ipAddress` |
| `USER_UPDATED` | Auth | `userId`, `username`, `email`, `timestamp` |
| `USER_DELETED` | Auth | `userId`, `username`, `email`, `timestamp` |
| `USER_SUSPENDED` | Auth | `userId`, `username`, `email`, `timestamp` |
| `USER_REINSTATED` | Auth | `userId`, `username`, `email`, `timestamp` |
| `EMAIL_VERIFIED` | Auth | `username`, `verifiedItem` |
| `PHONE_VERIFIED` | Auth | `username`, `verifiedItem` |
| `PROFILE_COMPLETED` | Auth | `username`, `verifiedItem` |
| `MAGIC_LINK` | Auth | `username`, `magicUrl` |
| `TEAM_INVITE` | Auth | `inviteeEmail`, `inviteeName`, `invitedBy`, `teamName`, `role`, `inviteUrl` |
| `ROLE_ASSIGNED` | Auth | `username`, `roleName`, `permissions`, `changedBy` |
| `ROLE_REVOKED` | Auth | `username`, `roleName`, `changedBy` |
| `CONSENT_REQUIRED` | Auth | `username`, `consentType`, `detailsUrl` |
| `PASSWORD_CHANGED` | Auth | `name`, `username` |
| `PASSWORD_RESET_REQUESTED` | Auth | `name`, `username`, `resetToken` or `resetLink` |
| `PASSWORD_RESET_COMPLETED` | Auth | `name`, `username` |
| `PASSWORD_EXPIRED` | Auth | `username`, `resetToken` or `resetUrl` |
| `PRIVACY_POLICY_UPDATED` | Auth | `effectiveDate` |
| `TERMS_OF_SERVICE_UPDATED` | Auth | `effectiveDate` |
| `TRIAL_EXPIRING` | Auth | `username`, `daysLeft`, `planName` |
| `DATA_EXPORT_READY` | Auth | `username`, `downloadUrl` |
| `BIRTHDAY_GREETING` | Auth | `username` |
| `NEWSLETTER_WELCOME` | Auth | `email`, `companyName`, `unsubscribeUrl` |
| `LOGIN_FAILED` | Security | `name`, `username`, `ipAddress`, `timestamp` |
| `NEW_DEVICE_LOGIN` | Security | `name`, `username`, `ipAddress`, `device`, `timestamp` |
| `ACCOUNT_LOCKED` | Security | `name`, `username`, `maxAttempts` |
| `ACCOUNT_UNLOCKED` | Security | `name`, `username` |
| `ACCOUNT_RECOVERY_REQUESTED` | Security | `name`, `username`, `unlockLink` |
| `ACCOUNT_RECOVERY_COMPLETED` | Security | `username`, `accountId` |
| `SOCIAL_LOGIN_CONNECTED` | Security | `name`, `username`, `provider`, `timestamp` |
| `SOCIAL_LOGIN_DISCONNECTED` | Security | `name`, `username`, `provider`, `timestamp` |
| `MFA_ENABLED` | Security | `name`, `username`, `device`, `timestamp` |
| `MFA_DISABLED` | Security | `name`, `username`, `device`, `timestamp` |
| `SESSION_EXPIRED` | Security | `username`, `device`, `timestamp` |
| `CONTACT_NOTIFICATION` | CRM | `name`, `email`, `subject`, `message` |
| `CONTACT_REPLY` | CRM | `name`, `email`, `subject`, `message` |
| `CONTACT_CONFIRMATION` | CRM | `name`, `subject`, `contactId` |
| `INQUIRY_NOTIFICATION` | CRM | `name`, `email`, `projectType`, `budget`, `inquiryId` |
| `INQUIRY_CONFIRMATION` | CRM | `name`, `projectType`, `inquiryId` |
| `ORG_CREATED` | Org | `orgName`, `orgId`, `adminName`, `adminEmail` |
| `ORG_UPDATED` | Org | `orgName`, `orgId`, `updatedBy`, `updatedFields` |
| `ORG_DELETED` | Org | `orgName`, `orgId`, `deletedBy` |
| `ORG_PLAN_CHANGED` | Org | `orgName`, `oldPlan`, `newPlan`, `changedBy` |
| `ORG_MEMBER_INVITED` | Org | `orgName`, `inviteeEmail`, `role`, `inviteUrl` |
| `ORG_MEMBER_REMOVED` | Org | `orgName`, `memberName`, `memberEmail`, `removedBy` |
| `ORG_ROLE_ASSIGNED` | Org | `orgName`, `memberName`, `roleName`, `assignedBy` |
| `ORG_ROLE_CHANGED` | Org | `orgName`, `memberName`, `oldRole`, `newRole`, `changedBy` |
| `ORG_ROLE_REVOKED` | Org | `orgName`, `memberName`, `roleName`, `revokedBy` |
| `ORG_API_KEY_CREATED` | Org | `orgName`, `keyName`, `keyPrefix`, `createdBy` |
| `ORG_API_KEY_REVOKED` | Org | `orgName`, `keyName`, `revokedBy` |
| `ORG_DOMAIN_VERIFIED` | Org | `orgName`, `domain`, `verifiedBy` |
| `ORG_DOMAIN_UNVERIFIED` | Org | `orgName`, `domain`, `reason` |
| `ORG_BILLING_UPDATED` | Org | `orgName`, `updatedBy`, `updatedFields` |
| `ORG_COMPLIANCE_AUDIT_COMPLETED` | Org | `orgName`, `auditType`, `completedAt`, `status` |
| `PAYMENT_SUCCESS` | Payment | `username`, `amount`, `transactionId`, `date` |
| `PAYMENT_FAILED` | Payment | `username`, `amount`, `transactionId`, `date` |
| `PAYMENT_PENDING` | Payment | `username`, `amount`, `paymentMethod` |
| `PAYMENT_REFUNDED` | Payment | `username`, `amount`, `transactionId`, `refundDate` |
| `INVOICE_GENERATED` | Payment | `username`, `invoiceNumber`, `dueDate`, `amount` |
| `INVOICE_PAID` | Payment | `username`, `invoiceNumber`, `paymentDate`, `amount` |
| `INVOICE_OVERDUE` | Payment | `username`, `invoiceNumber`, `dueDate`, `amount` |
| `INVOICE_CANCELLED` | Payment | `username`, `invoiceNumber` |
| `BILLING_INFO_UPDATED` | Payment | `username`, `updatedFields` |
| `CHARGEBACK_INITIATED` | Payment | `username`, `transactionId`, `amount`, `chargebackDate` |
| `CHARGEBACK_RESOLVED` | Payment | `username`, `transactionId`, `amount`, `resolutionDate`, `outcome` |
| `AUTO_RENEWAL_REMINDER` | Subscription | `username`, `subscriptionName`, `renewalDate`, `amount` |
| `SUBSCRIPTION_STARTED` | Subscription | `username`, `subscriptionName`, `startDate` |
| `SUBSCRIPTION_CANCELLED` | Subscription | `username`, `subscriptionName`, `cancelledAt` |
| `SUBSCRIPTION_RENEWED` | Subscription | `username`, `subscriptionName`, `renewalDate`, `amount` |
| `CART_CREATED` | Cart | `username`, `cartId`, `itemCount` |
| `CART_UPDATED` | Cart | `username`, `cartId`, `itemCount`, `totalAmount` |
| `CART_ABANDONED` | Cart | `username`, `cartId`, `items`, `totalAmount` |
| `CART_EXPIRY_NOTIFICATION` | Cart | `username`, `cartId`, `itemCount`, `expiryDate`, `hoursRemaining` |
| `CART_ITEM_PRICE_CHANGED` | Cart | `username`, `cartId`, `productName`, `oldPrice`, `newPrice` |
| `WISHLIST_CREATED` | Wishlist | `username`, `wishlistId`, `itemCount` |
| `WISHLIST_REMINDER` | Wishlist | `username`, `wishlistId`, `items` |
| `WISHLIST_PRICE_DROP` | Wishlist | `username`, `productName`, `oldPrice`, `newPrice` |
| `WISHLIST_BACK_IN_STOCK` | Wishlist | `username`, `productName`, `productId` |
| `ORDER_CREATED` | Order | `username`, `orderId`, `orderDate`, `items`, `totalAmount` |
| `ORDER_CONFIRMED` | Order | `username`, `orderId`, `estimatedDelivery`, `totalAmount` |
| `ORDER_SHIPPED` | Order | `username`, `orderId`, `trackingNumber`, `carrier` |
| `ORDER_DELIVERED` | Order | `username`, `orderId`, `deliveryDate` |
| `ORDER_DELAYED` | Order | `username`, `orderId`, `reason`, `newEstimatedDelivery` |
| `ORDER_CANCELLED` | Order | `username`, `orderId`, `reason` |
| `ORDER_REFUNDED` | Order | `username`, `orderId`, `refundAmount`, `refundDate` |
| `ORDER_PAYMENT_PENDING` | Order | `username`, `orderId`, `amount`, `paymentMethod` |
| `ORDER_PAYMENT_FAILED` | Order | `username`, `orderId`, `amount`, `failureReason` |
| `ORDER_PARTIALLY_SHIPPED` | Order | `username`, `orderId`, `shippedItems`, `remainingItems` |
| `CUSTOM_ORDER_CONFIRMED` | Order | `username`, `orderId`, `customDetails`, `estimatedCompletion` |
| `RETURN_REQUEST_RECEIVED` | Return | `username`, `orderId`, `returnId` |
| `RETURN_APPROVED` | Return | `username`, `orderId`, `returnId`, `returnInstructions` |
| `RETURN_REJECTED` | Return | `username`, `orderId`, `returnId`, `rejectionReason` |
| `RETURN_COMPLETED` | Return | `username`, `orderId`, `returnId`, `refundAmount` |
| `EXCHANGE_REQUESTED` | Exchange | `username`, `orderId`, `exchangeId`, `originalItem`, `requestedItem` |
| `EXCHANGE_APPROVED` | Exchange | `username`, `orderId`, `exchangeId`, `newItem`, `returnLabel` |
| `EXCHANGE_REJECTED` | Exchange | `username`, `orderId`, `exchangeId`, `rejectionReason` |
| `PACKAGE_DISPATCHED` | Shipping | `username`, `orderId`, `trackingNumber` |
| `PACKAGE_IN_TRANSIT` | Shipping | `username`, `orderId`, `trackingNumber`, `currentLocation` |
| `PACKAGE_OUT_FOR_DELIVERY` | Shipping | `username`, `orderId`, `trackingNumber`, `deliveryAddress` |
| `PACKAGE_DELIVERED` | Shipping | `username`, `orderId`, `deliveredAt`, `deliveryAddress` |
| `PACKAGE_DELAYED` | Shipping | `username`, `orderId`, `originalDelivery`, `newDelivery`, `reason` |
| `PACKAGE_LOST` | Shipping | `username`, `orderId`, `trackingNumber`, `lastLocation` |
| `DELIVERY_EXCEPTION` | Shipping | `username`, `orderId`, `exceptionType`, `details`, `nextStep` |
| `CUSTOMS_HOLD` | Shipping | `username`, `orderId`, `holdReason`, `requiredActions` |
| `PRODUCT_CREATED` | Product | `productName`, `productId`, `sku`, `category`, `createdBy` |
| `PRODUCT_UPDATED` | Product | `productName`, `productId`, `updatedFields`, `updatedBy` |
| `PRODUCT_DELETED` | Product | `productName`, `productId`, `deletedBy` |
| `PRODUCT_OUT_OF_STOCK` | Product | `productName`, `productId` |
| `PRODUCT_BACK_IN_STOCK` | Product | `username`, `productName`, `productId` |
| `STOCK_LOW` | Inventory | `productName`, `currentStock`, `minimumThreshold`, `productId` |
| `STOCK_CRITICAL` | Inventory | `productName`, `currentStock`, `criticalThreshold`, `productId` |
| `STOCK_REPLENISHED` | Inventory | `productName`, `quantityAdded`, `newStock`, `supplier`, `productId` |
| `INVENTORY_AUDIT_COMPLETED` | Inventory | `auditType`, `completedAt`, `discrepancies` |
| `SUPPLIER_DELAY` | Inventory | `supplierName`, `orderId`, `originalDelivery`, `newDelivery` |
| `BATCH_EXPIRING_SOON` | Inventory | `productName`, `batchNumber`, `expiryDate`, `daysRemaining` |
| `SYSTEM_ALERT` | System | `alertType`, `severity`, `message`, `affectedServices`, `detectedAt` |
| `MAINTENANCE_SCHEDULED` | System | `maintenanceType`, `scheduledStart`, `scheduledEnd`, `duration` |
| `MAINTENANCE_STARTED` | System | `maintenanceType`, `startedAt`, `estimatedEnd` |
| `MAINTENANCE_COMPLETED` | System | `maintenanceType`, `completedAt`, `duration` |
| `DATA_BACKUP_COMPLETED` | System | `backupType`, `completedAt`, `backupSize`, `status` |
| `DEPLOYMENT_STARTED` | System | `serviceName`, `version`, `environment` |
| `DEPLOYMENT_COMPLETED` | System | `serviceName`, `version`, `environment`, `completedAt` |
| `DEPLOYMENT_FAILED` | System | `serviceName`, `version`, `environment`, `errorMessage` |
| `SERVICE_OUTAGE_DETECTED` | System | `serviceName`, `detectedAt`, `errorDetails` |
| `SERVICE_RECOVERED` | System | `serviceName`, `recoveredAt`, `outageDuration`, `rootCause` |
| `NEW_FEATURE_RELEASED` | System | `featureName`, `releaseDate`, `description` |
| `PROMOTION_LAUNCHED` | Marketing | `username`, `promotionName`, `description`, `discountPercentage`, `validFrom`, `validTo` |
| `DISCOUNT_APPLIED` | Marketing | `username`, `discountAmount`, `discountType` |
| `FLASH_SALE_ANNOUNCEMENT` | Marketing | `saleName`, `startsAt`, `endsAt`, `discount` |
| `LOYALTY_POINTS_EARNED` | Marketing | `username`, `pointsEarned`, `totalPoints` |
| `LOYALTY_POINTS_REDEEMED` | Marketing | `username`, `pointsRedeemed`, `remainingPoints` |
| `NEW_PRODUCT_LAUNCH` | Marketing | `username`, `productName`, `description`, `launchDate` |
| `CUSTOMER_MILESTONE` | Marketing | `username`, `milestoneType`, `milestoneValue` |
| `REVIEW_REMINDER` | Marketing | `username`, `productName`, `orderId` |
| `EVENT_INVITATION` | Marketing | `username`, `eventName`, `eventDate`, `eventTime`, `rsvpUrl` |
| `HOLIDAY_GREETINGS` | Marketing | `username`, `holidayName`, `greeting` |
| `MESSAGE_RECEIVED` | Notify | `recipientName`, `senderName`, `messagePreview`, `receivedAt` |
| `COMMENT_POSTED` | Notify | `username`, `commenterName`, `contentType`, `commentPreview` |
| `MENTION_RECEIVED` | Notify | `username`, `mentionedBy`, `context`, `contentPreview`, `mentionUrl` |
| `CHAT_STARTED` | Notify | `username`, `chatInitiator`, `topic`, `joinUrl` |
| `DAILY_REPORT_READY` | Analytics | `username`, `reportDate`, `metrics`, `reportUrl` |
| `WEEKLY_REPORT_READY` | Analytics | `username`, `weekStart`, `weekEnd`, `metrics` |
| `DATA_TREND_ALERT` | Analytics | `username`, `trendType`, `metric`, `change`, `percentageChange` |
| `KPI_THRESHOLD_BREACHED` | Analytics | `username`, `kpiName`, `currentValue`, `threshold`, `direction` |
| `LEAD_RECEIVED` | CRM | `firstName`, `lastName`, `leadNumber`, `subject` |
| `LEAD_ADMIN_NOTIFICATION` | CRM | `leadNumber`, `firstName`, `lastName`, `email`, `subject` |
| `LEAD_CONTACT_REPLY` | CRM | `firstName`, `lastName`, `leadNumber`, `subject`, `message`, `agentName` |
| `LEAD_STATUS_CHANGED` | CRM | `firstName`, `leadNumber`, `oldStatus`, `newStatus` |
| `LEAD_FOLLOW_UP_REMINDER` | CRM | `agentName`, `leadNumber`, `leadFirstName`, `reviewUrl` |
| `PROJECT_PROPOSAL_EMAIL` | CRM | `clientName`, `projectName`, `proposalUrl`, `proposalNumber` |
| `LEAD_PROPOSAL_ACCEPTED` | CRM | `firstName`, `leadNumber`, `projectName`, `quotedAmount` |
| `LEAD_PROPOSAL_DECLINED_ACK` | CRM | `firstName`, `leadNumber`, `projectName`, `agentName` |
| `LEAD_PROPOSAL_EXPIRING` | CRM | `leadNumber`, `firstName`, `proposalNumber`, `validUntil`, `daysRemaining` |
| `LEAD_CONTRACT_SENT` | CRM | `firstName`, `leadNumber`, `projectName`, `contractUrl` |
| `LEAD_CONTRACT_SIGNED` | CRM | `firstName`, `leadNumber`, `projectName`, `contractSignedAt` |
| `LEAD_WON_NOTIFICATION` | CRM | `leadNumber`, `firstName`, `lastName`, `projectName` |
| `LEAD_LOST_NOTIFICATION` | CRM | `leadNumber`, `firstName`, `lastName`, `lostReason` |
| `MARKETPLACE_WELCOME` | Marketplace | `name`, `email`, `dashboardUrl` |
| `MARKETPLACE_EMAIL_VERIFICATION` | Marketplace | `name`, `verificationLink` |
| `MARKETPLACE_PASSWORD_RESET` | Marketplace | `name`, `resetLink` |
| `MARKETPLACE_NEW_REQUEST` | Marketplace | `providerName`, `requestTitle`, `category`, `budget`, `customerName`, `requestDisplayId`, `requestUrl` |
| `MARKETPLACE_PROPOSAL_RECEIVED` | Marketplace | `customerName`, `providerName`, `requestTitle`, `price`, `proposalDisplayId`, `proposalUrl` |
| `MARKETPLACE_JOB_ASSIGNED` | Marketplace | `providerName`, `requestTitle`, `customerName`, `price`, `jobDisplayId`, `jobUrl` |
| `MARKETPLACE_PAYMENT_RECEIVED` | Marketplace | `providerName`, `amount`, `jobTitle`, `customerName`, `dashboardUrl` |
| `ORDER_RETURNED` | Order | `username`, `orderId`, `returnReason`, `returnDate`, `refundAmount` |
| `SERVER_RESTARTED` | System | `serverName`, `restartReason`, `restartedAt`, `uptime`, `services` |
| `SERVER_OVERLOADED` | System | `serverName`, `cpuUsage`, `memoryUsage`, `diskUsage`, `detectedAt`, `threshold`, `recommendation` |
| `CONFIGURATION_CHANGED` | System | `configType`, `changedBy`, `changedAt`, `changes`, `environment` |
| `PRODUCT_FEATURED` | Product | `productName`, `productId`, `featureType`, `startDate`, `endDate`, `placement` |
| `PRODUCT_REVIEWED` | Product | `productName`, `productId`, `reviewerName`, `rating`, `reviewText`, `approvalStatus` |
| `PRODUCT_ARCHIVED` | Product | `productName`, `productId`, `archivedBy`, `reason`, `archivedAt` |
| `MESSAGE_SENT` | Notify | `senderName`, `recipientName`, `messagePreview`, `sentAt`, `messageId` |
| `MESSAGE_READ` | Notify | `senderName`, `recipientName`, `readAt`, `messageId` |
| `COMMENT_REPLIED` | Notify | `username`, `replyName`, `originalComment`, `replyContent`, `repliedAt`, `replyUrl` |
| `EMAIL_DELIVERED` | Notify | `emailAddress`, `messageSubject`, `deliveredAt`, `deliveryStatus` |
| `EMAIL_FAILED` | Notify | `emailAddress`, `messageSubject`, `failureReason`, `failedAt`, `retryStatus` |
| `PUSH_NOTIFICATION_SENT` | Notify | `deviceType`, `notificationTitle`, `notificationBody`, `sentAt`, `targetAudience` |
| `CHAT_ENDED` | Notify | `username`, `chatWith`, `topic`, `chatId`, `endedAt`, `duration`, `summary` |
| `MONTHLY_REPORT_READY` | Analytics | `username`, `month`, `year`, `metrics`, `goalComparison`, `achievements`, `reportUrl` |
| `TRAFFIC_SPIKE` | Analytics | `username`, `spikePercentage`, `currentTraffic`, `normalTraffic`, `cause`, `duration`, `actionUrl` |
| `CONVERSION_RATE_DROP` | Analytics | `username`, `currentRate`, `previousRate`, `percentageDrop`, `impact`, `possibleCauses`, `actionUrl` |
| `ENGAGEMENT_INCREASED` | Analytics | `username`, `engagementMetric`, `increasePercentage`, `currentValue`, `previousValue`, `highlights`, `celebrationUrl` |
| `LEAD_ADMIN_PROPOSAL_ACCEPTED` | CRM | `leadNumber`, `firstName`, `lastName`, `email`, `company`, `projectName`, `quotedAmount`, `quotedCurrency`, `reviewUrl` |
| `LEAD_ADMIN_PROPOSAL_DECLINED` | CRM | `leadNumber`, `firstName`, `lastName`, `email`, `company`, `declinedReason`, `reviewUrl` |
| `LEAD_PROPOSAL_EXPIRED` | CRM | `leadNumber`, `firstName`, `lastName`, `email`, `proposalNumber`, `expiredAt`, `reviewUrl` |
| `welcomeEmailTemplate` | Auth (Legacy) | `username` |
| `passwordExpiryReminderTemplate` | Auth (Legacy) | `username`, `resetLink` |
| `accountDeactivationWarningTemplate` | Auth (Legacy) | `username`, `reactivateLink` |
| `accountReactivatedTemplate` | Auth (Legacy) | `username` |
| `twoFactorCompletedTemplate` | Auth (Legacy) | `username` |
| `newDeviceApprovalTemplate` | Security (Legacy) | `username`, `device`, `approveLink`, `denyLink` |
| `emailChangedTemplate` | Security (Legacy) | `username`, `oldEmail`, `newEmail` |
| `loginAlertTemplate` | Security (Legacy) | `username`, `device`, `location`, `time` |
| `sessionExpiredTemplate` | Security (Legacy) | `username` |
| `accountRecoveryTemplate` | Security (Legacy) | `username`, `recoveryLink` |
| `accountReactivationTemplate` | Security (Legacy) | `username`, `reactivateLink` |
| `accountSuspendedTemplate` | Security (Legacy) | `username`, `reason`, `supportLink` |
| `consentRequiredTemplate` | Security (Legacy) | `username`, `consentLink` |
| `securitySettingsUpdatedTemplate` | Security (Legacy) | `username`, `setting` |
| `failedLoginAttemptsTemplate` | Security (Legacy) | `username`, `attempts`, `lockLink` |
| `accountVerifiedTemplate` | Security (Legacy) | `username` |
| `trustedDeviceAddedTemplate` | Security (Legacy) | `username`, `device`, `location` |
| `phoneVerificationTemplate` | Security (Legacy) | `username`, `phone`, `verificationCode`, `expiryMinutes` |
| `emailPhoneVerificationReminderTemplate` | Security (Legacy) | `username` |
| `phoneNumberChangeRequestTemplate` | Security (Legacy) | `username`, `newPhone`, `confirmationCode`, `expiryMinutes` |
| `phoneNumberChangeConfirmationTemplate` | Security (Legacy) | `username`, `updatedPhone` |
| `dataExportReadyTemplate` | Auth (Legacy) | `username`, `downloadLink` |
| `dataExportRequestTemplate` | Auth (Legacy) | `username`, `requestDate` |
| `privacyPolicyUpdateTemplate` | Auth (Legacy) | `username`, `policyLink` |
| `termsOfServiceUpdateTemplate` | Auth (Legacy) | `username`, `termsLink` |
| `policyUpdateTemplate` | Auth (Legacy) | `username`, `policyLink` |
| `loginAttemptLimitExceededTemplate` | Security (Legacy) | `username` |
| `twoFactorEnabledDisabledNotificationTemplate` | Security (Legacy) | `username`, `status` |
| `accountVerificationReminderTemplate` | Security (Legacy) | `username` |
| `accountSecurityAuditCompletedTemplate` | Security (Legacy) | `username` |
| `backupEmailAddedRemovedTemplate` | Security (Legacy) | `username`, `action` |
| `trustedDeviceManagementUpdateTemplate` | Security (Legacy) | `username` |
| `multiFactorAuthenticationSetupReminderTemplate` | Security (Legacy) | `username` |
| `secondaryPhoneVerificationTemplate` | Security (Legacy) | `username`, `verificationCode`, `expiryMinutes` |
| `identityVerificationRequestTemplate` | Security (Legacy) | `username` |
| `identityVerificationResultTemplate` | Security (Legacy) | `username`, `result` |
| `accountAccessRevokedTemplate` | Security (Legacy) | `username` |
| `passwordStrengthWarningTemplate` | Security (Legacy) | `username` |
| `accountMergeConfirmationTemplate` | Security (Legacy) | `username` |
| `socialLoginConnectionTemplate` | Security (Legacy) | `username`, `action` |
| `reviewRequestTemplate` | Marketing (Legacy) | `username`, `product`, `reviewLink` |
| `paymentRefundedTemplate` | Payment (Legacy) | `username`, `amount`, `refundDate` |
| `wishlistReminderTemplate` | Wishlist (Legacy) | `username`, `wishlistItems` |
| `wishlistBackInStockTemplate` | Wishlist (Legacy) | `username`, `itemName` |
| `wishlistPriceDropAlertTemplate` | Wishlist (Legacy) | `username`, `itemName`, `newPrice` |
| `savedForLaterReminderTemplate` | Wishlist (Legacy) | `username`, `savedItems` |
| `cartItemPriceChangedTemplate` | Cart (Legacy) | `username`, `itemName`, `oldPrice`, `newPrice` |
| `wishlistItemDiscontinuedTemplate` | Wishlist (Legacy) | `username`, `itemName` |
| `cartExpiryNotificationTemplate` | Cart (Legacy) | `username` |
| `orderProcessingTemplate` | Order (Legacy) | `username`, `orderId` |
| `orderPackedTemplate` | Order (Legacy) | `username`, `orderId` |
| `orderOutForDeliveryTemplate` | Order (Legacy) | `username`, `orderId` |
| `partialOrderShippedTemplate` | Order (Legacy) | `username`, `orderId` |
| `orderSplitShipmentTemplate` | Order (Legacy) | `username`, `orderId` |
| `deliveryDelayedNotificationTemplate` | Order (Legacy) | `username`, `orderId` |
| `orderCanceledByCustomerTemplate` | Order (Legacy) | `username`, `orderId` |
| `orderCanceledByStoreTemplate` | Order (Legacy) | `username`, `orderId`, `reason` |
| `preOrderConfirmationTemplate` | Order (Legacy) | `username`, `productName`, `releaseDate` |
| `preOrderShippedTemplate` | Order (Legacy) | `username`, `productName` |
| `digitalDownloadReadyTemplate` | Order (Legacy) | `username`, `downloadLink` |
| `customOrderConfirmedTemplate` | Order (Legacy) | `username` |
| `orderModificationRequestReceivedTemplate` | Order (Legacy) | `username`, `orderId` |
| `orderModificationResultTemplate` | Order (Legacy) | `username`, `orderId`, `status` |
| `returnRequestReceivedTemplate` | Return (Legacy) | `username`, `orderId` |
| `returnApprovedTemplate` | Return (Legacy) | `username`, `orderId`, `instructions` |
| `returnRejectedTemplate` | Return (Legacy) | `username`, `orderId`, `reason` |
| `refundProcessedTemplate` | Return (Legacy) | `username`, `orderId` |
| `exchangeApprovedTemplate` | Return (Legacy) | `username`, `orderId`, `nextSteps` |
| `exchangeRejectedTemplate` | Return (Legacy) | `username`, `orderId`, `reason` |
| `returnShipmentReceivedTemplate` | Return (Legacy) | `username`, `orderId` |
| `partialRefundProcessedTemplate` | Return (Legacy) | `username`, `orderId`, `details` |
| `paymentSuccessfulTemplate` | Payment (Legacy) | `username`, `orderId`, `amount` |
| `paymentMethodExpiringSoonTemplate` | Payment (Legacy) | `username`, `expiryDate` |
| `subscriptionStartedTemplate` | Subscription (Legacy) | `username`, `subscriptionName`, `startDate` |
| `subscriptionRenewedSuccessfullyTemplate` | Subscription (Legacy) | `username`, `subscriptionName` |
| `subscriptionFailedRetryNeededTemplate` | Subscription (Legacy) | `username`, `subscriptionName` |
| `subscriptionCanceledTemplate` | Subscription (Legacy) | `username`, `subscriptionName` |
| `creditNoteIssuedTemplate` | Payment (Legacy) | `username`, `creditNoteNumber`, `amount`, `issueDate` |
| `giftCardPurchasedTemplate` | Payment (Legacy) | `username`, `giftCardCode`, `amount` |
| `giftCardRedeemedTemplate` | Payment (Legacy) | `username`, `giftCardCode`, `amount` |
| `storeCreditAddedTemplate` | Payment (Legacy) | `username`, `amount` |
| `storeCreditUsedTemplate` | Payment (Legacy) | `username`, `amount` |
| `emiPaymentReminderTemplate` | Payment (Legacy) | `username`, `dueDate` |
| `paymentDisputeNotificationTemplate` | Payment (Legacy) | `username`, `orderId` |
| `paymentDisputeResolvedTemplate` | Payment (Legacy) | `username`, `orderId` |
| `paymentMethodUpdatedTemplate` | Payment (Legacy) | `username` |
| `subscriptionPauseConfirmationTemplate` | Subscription (Legacy) | `username`, `subscriptionName` |
| `onboardingSeriesTemplate` | Marketing (Legacy) | `username` |
| `customerMilestoneTemplate` | Marketing (Legacy) | `username`, `period` |
| `loyaltyPointsRedeemedTemplate` | Marketing (Legacy) | `username`, `points` |
| `loyaltyPointsExpiryReminderTemplate` | Marketing (Legacy) | `username` |
| `referralInvitationTemplate` | Marketing (Legacy) | `username` |
| `referralBonusEarnedTemplate` | Marketing (Legacy) | `username`, `bonus` |
| `referralBonusUsedTemplate` | Marketing (Legacy) | `username`, `bonus` |
| `seasonalSaleAnnouncementTemplate` | Marketing (Legacy) | `username` |
| `flashSaleTemplate` | Marketing (Legacy) | `username` |
| `earlyAccessToSaleTemplate` | Marketing (Legacy) | `username` |
| `sneakPeekTemplate` | Marketing (Legacy) | `username` |
| `exclusiveEventTemplate` | Marketing (Legacy) | `username` |
| `surveyRequestTemplate` | Marketing (Legacy) | `username` |
| `holidayGreetingsTemplate` | Marketing (Legacy) | `username` |
| `csrStoriesTemplate` | Marketing (Legacy) | `username` |
| `appDownloadInvitationTemplate` | Marketing (Legacy) | `username` |
| `abandonedBrowseReminderTemplate` | Marketing (Legacy) | `username`, `items` |
| `loyaltyTierChangeTemplate` | Marketing (Legacy) | `username`, `change` |
| `otpForLoginTemplate` | Security (Legacy) | `username`, `otp`, `expiryMinutes` |
| `failedLoginAttemptWarningTemplate` | Security (Legacy) | `username`, `attempts` |
| `systemMaintenanceNotificationTemplate` | System (Legacy) | `username`, `startTime`, `endTime` |
| `scheduledDowntimeNotificationTemplate` | System (Legacy) | `username`, `downtimeStart`, `downtimeEnd` |
| `fraudulentTransactionAlertTemplate` | Security (Legacy) | `username`, `transactionId`, `amount` |
| `sessionTimeoutNotificationTemplate` | Security (Legacy) | `username` |
| `accountSecurityCheckReminderTemplate` | Security (Legacy) | `username` |
| `fraudulentActivityDetectedAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `activityDetails` |
| `newOrderPlacedAdminTemplate` | Admin | `adminName`, `orderId`, `customerName`, `total` |
| `highValueOrderAlertAdminTemplate` | Admin | `adminName`, `orderId`, `amount` |
| `lowStockAlertAdminTemplate` | Admin | `adminName`, `productId`, `productName`, `currentStock` |
| `outOfStockNotificationAdminTemplate` | Admin | `adminName`, `productId`, `productName` |
| `productDisabledAdminTemplate` | Admin | `adminName`, `productId`, `productName` |
| `newReviewSubmittedAdminTemplate` | Admin | `adminName`, `productName`, `reviewId` |
| `paymentDisputeAlertAdminTemplate` | Admin | `adminName`, `orderId` |
| `returnRequestNotificationAdminTemplate` | Admin | `adminName`, `orderId` |
| `refundProcessedNotificationAdminTemplate` | Admin | `adminName`, `orderId` |
| `dailySalesReportAdminTemplate` | Admin | `adminName`, `reportDate`, `totalSales` |
| `weeklyMonthlySalesReportAdminTemplate` | Admin | `adminName`, `period`, `totalSales` |
| `systemErrorFailedJobAlertAdminTemplate` | Admin | `adminName`, `errorDetails` |
| `customerSupportTicketCreatedAdminTemplate` | Admin | `adminName`, `ticketId`, `customerName` |
| `inventoryRestockNotificationAdminTemplate` | Admin | `adminName`, `productName`, `productId` |
| `bulkOrderRequestAdminTemplate` | Admin | `adminName`, `requestId`, `requesterName` |
| `customerDataDeletionRequestAdminTemplate` | Admin | `adminName`, `userName`, `userId` |
| `suspiciousAccountActivityAlertAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `details` |
| `multipleFailedLoginAttemptsAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `attempts` |
| `accountSuspensionReinstatementNotificationAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `action` |
| `userProfileUpdateAlertAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `changes` |
| `twoFactorStatusChangeAlertAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `status` |
| `accountDeletionRequestDeniedAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `reason` |
| `unusualAccountLoginPatternAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `details` |
| `phoneVerificationStatusUpdateAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `status` |
| `emailVerificationFailureAlertAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `attempts` |
| `secondaryPhoneVerificationStatusUpdateAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `status` |
| `identityVerificationRequestReceivedAdminTemplate` | Admin | `adminName`, `userName`, `userId` |
| `identityVerificationOutcomeNotificationAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `result` |
| `accountAccessRevocationAdminTemplate` | Admin | `adminName`, `userName`, `userId` |
| `socialLoginConnectionAlertAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `action` |
| `accountMergeRequestReceivedAdminTemplate` | Admin | `adminName`, `userName`, `userId` |
| `highRiskAccountActivityAlertAdminTemplate` | Admin | `adminName`, `userName`, `userId`, `details` |
| `accountRecoveryRequestReceivedAdminTemplate` | Admin | `adminName`, `userName`, `userId` |

---

## 18. Additional Uppercase Templates

### `ORDER_RETURNED`

```json
{
  "to": "user@example.com",
  "templateId": "ORDER_RETURNED",
  "data": {
    "username": "Alice",
    "orderId": "ORD-001",
    "returnReason": "Item not as described",
    "returnDate": "2026-04-14",
    "refundAmount": "$49.99"
  }
}
```

---

### `SERVER_RESTARTED`

```json
{
  "to": "ops@company.com",
  "templateId": "SERVER_RESTARTED",
  "data": {
    "serverName": "api-prod-01",
    "restartReason": "Memory limit exceeded",
    "restartedAt": "2026-04-13T03:15:00Z",
    "uptime": "99.8%",
    "services": ["API Gateway", "Email Service", "Worker"]
  }
}
```

---

### `SERVER_OVERLOADED`

```json
{
  "to": "ops@company.com",
  "templateId": "SERVER_OVERLOADED",
  "data": {
    "serverName": "api-prod-01",
    "cpuUsage": "97%",
    "memoryUsage": "94%",
    "diskUsage": "78%",
    "detectedAt": "2026-04-13T10:00:00Z",
    "threshold": "90%",
    "recommendation": "Scale horizontally or restart affected services"
  }
}
```

---

### `CONFIGURATION_CHANGED`

```json
{
  "to": "ops@company.com",
  "templateId": "CONFIGURATION_CHANGED",
  "data": {
    "configType": "Feature Flags",
    "changedBy": "alice@company.com",
    "changedAt": "2026-04-13T10:00:00Z",
    "changes": ["dark_mode: false → true", "max_upload_mb: 10 → 25"],
    "environment": "production"
  }
}
```

---

### `PRODUCT_FEATURED`

```json
{
  "to": "manager@store.com",
  "templateId": "PRODUCT_FEATURED",
  "data": {
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "featureType": "Homepage Banner",
    "startDate": "2026-04-15",
    "endDate": "2026-04-22",
    "placement": "Hero section — top of homepage"
  }
}
```

---

### `PRODUCT_REVIEWED`

```json
{
  "to": "manager@store.com",
  "templateId": "PRODUCT_REVIEWED",
  "data": {
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "reviewerName": "Bob Customer",
    "rating": 4,
    "reviewText": "Great quality, arrived quickly. Colour slightly different from photo.",
    "approvalStatus": "pending"
  }
}
```

---

### `PRODUCT_ARCHIVED`

```json
{
  "to": "manager@store.com",
  "templateId": "PRODUCT_ARCHIVED",
  "data": {
    "productName": "Blue T-Shirt",
    "productId": "prod_abc",
    "archivedBy": "alice@store.com",
    "reason": "Discontinued — replaced by v2",
    "archivedAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### `MESSAGE_SENT`

```json
{
  "to": "user@example.com",
  "templateId": "MESSAGE_SENT",
  "data": {
    "senderName": "Alice",
    "recipientName": "Bob",
    "messagePreview": "Hey Bob, just checking in on the project...",
    "sentAt": "2026-04-13T10:00:00Z",
    "messageId": "msg_abc123"
  }
}
```

---

### `MESSAGE_READ`

```json
{
  "to": "user@example.com",
  "templateId": "MESSAGE_READ",
  "data": {
    "senderName": "Alice",
    "recipientName": "Bob",
    "readAt": "2026-04-13T10:05:00Z",
    "messageId": "msg_abc123"
  }
}
```

---

### `COMMENT_REPLIED`

```json
{
  "to": "user@example.com",
  "templateId": "COMMENT_REPLIED",
  "data": {
    "username": "alice_smith",
    "replyName": "Bob Jones",
    "originalComment": "Great article, very informative!",
    "replyContent": "Thank you Alice! Glad it helped.",
    "repliedAt": "2026-04-13T10:00:00Z",
    "replyUrl": "https://app.com/posts/123#reply-456"
  }
}
```

---

### `EMAIL_DELIVERED`

```json
{
  "to": "admin@company.com",
  "templateId": "EMAIL_DELIVERED",
  "data": {
    "emailAddress": "alice@example.com",
    "messageSubject": "Your order has shipped",
    "deliveredAt": "2026-04-13T10:01:22Z",
    "deliveryStatus": "delivered"
  }
}
```

---

### `EMAIL_FAILED`

```json
{
  "to": "admin@company.com",
  "templateId": "EMAIL_FAILED",
  "data": {
    "emailAddress": "alice@example.com",
    "messageSubject": "Your order has shipped",
    "failureReason": "550 Mailbox not found",
    "failedAt": "2026-04-13T10:01:22Z",
    "retryStatus": "No retry — permanent failure"
  }
}
```

---

### `PUSH_NOTIFICATION_SENT`

```json
{
  "to": "admin@company.com",
  "templateId": "PUSH_NOTIFICATION_SENT",
  "data": {
    "deviceType": "iOS",
    "notificationTitle": "Your order has shipped!",
    "notificationBody": "Order ORD-001 is on its way. Track it here.",
    "sentAt": "2026-04-13T10:00:00Z",
    "targetAudience": "All active users"
  }
}
```

---

### `CHAT_ENDED`

```json
{
  "to": "user@example.com",
  "templateId": "CHAT_ENDED",
  "data": {
    "username": "Alice",
    "chatWith": "Support Agent Bob",
    "topic": "Order inquiry",
    "chatId": "chat_abc",
    "endedAt": "2026-04-13T10:45:00Z",
    "duration": "12 minutes",
    "summary": "Investigated delayed shipment. Escalated to logistics team."
  }
}
```

---

### `MONTHLY_REPORT_READY`

```json
{
  "to": "manager@company.com",
  "templateId": "MONTHLY_REPORT_READY",
  "data": {
    "username": "Alice",
    "month": "March",
    "year": 2026,
    "metrics": { "revenue": "$182,400", "orders": 1842, "newUsers": 348 },
    "goalComparison": "Revenue 12% above target",
    "achievements": ["Best month since launch", "NPS score 72"],
    "reportUrl": "https://app.com/reports/monthly/2026-03"
  }
}
```

---

### `TRAFFIC_SPIKE`

```json
{
  "to": "manager@company.com",
  "templateId": "TRAFFIC_SPIKE",
  "data": {
    "username": "Alice",
    "spikePercentage": 340,
    "currentTraffic": "14,200 req/min",
    "normalTraffic": "3,200 req/min",
    "cause": "Viral social media post",
    "duration": "Ongoing (started 35 minutes ago)",
    "actionUrl": "https://app.com/analytics/realtime"
  }
}
```

---

### `CONVERSION_RATE_DROP`

```json
{
  "to": "manager@company.com",
  "templateId": "CONVERSION_RATE_DROP",
  "data": {
    "username": "Alice",
    "currentRate": "1.2%",
    "previousRate": "3.8%",
    "percentageDrop": 68,
    "impact": "Est. $4,200 lost revenue today",
    "possibleCauses": ["Checkout page error on mobile", "Payment gateway latency"],
    "actionUrl": "https://app.com/analytics/conversion"
  }
}
```

---

### `ENGAGEMENT_INCREASED`

```json
{
  "to": "manager@company.com",
  "templateId": "ENGAGEMENT_INCREASED",
  "data": {
    "username": "Alice",
    "engagementMetric": "Daily Active Users",
    "increasePercentage": 42,
    "currentValue": "8,540",
    "previousValue": "6,012",
    "highlights": ["Push notification campaign success", "New onboarding flow launched"],
    "celebrationUrl": "https://app.com/analytics/engagement"
  }
}
```

---

### `LEAD_ADMIN_PROPOSAL_ACCEPTED`
Internal admin notification when a lead accepts a proposal.

```json
{
  "to": "sales-team@company.com",
  "templateId": "LEAD_ADMIN_PROPOSAL_ACCEPTED",
  "data": {
    "leadNumber": "LEAD-2026-001",
    "firstName": "Bob",
    "lastName": "Customer",
    "email": "bob@example.com",
    "company": "ACME Ltd",
    "projectName": "Website Redesign",
    "quotedAmount": "15000",
    "quotedCurrency": "USD",
    "reviewUrl": "https://crm.app.com/leads/LEAD-2026-001"
  }
}
```

---

### `LEAD_ADMIN_PROPOSAL_DECLINED`
Internal admin notification when a lead declines a proposal.

```json
{
  "to": "sales-team@company.com",
  "templateId": "LEAD_ADMIN_PROPOSAL_DECLINED",
  "data": {
    "leadNumber": "LEAD-2026-001",
    "firstName": "Bob",
    "lastName": "Customer",
    "email": "bob@example.com",
    "company": "ACME Ltd",
    "declinedReason": "Budget constraints — will revisit next quarter",
    "reviewUrl": "https://crm.app.com/leads/LEAD-2026-001"
  }
}
```

---

### `LEAD_PROPOSAL_EXPIRED`
Internal notification when a proposal expires without a response.

```json
{
  "to": "sales-team@company.com",
  "templateId": "LEAD_PROPOSAL_EXPIRED",
  "data": {
    "leadNumber": "LEAD-2026-001",
    "firstName": "Bob",
    "lastName": "Customer",
    "email": "bob@example.com",
    "proposalNumber": "PROP-2026-001",
    "expiredAt": "2026-04-27T00:00:00Z",
    "reviewUrl": "https://crm.app.com/leads/LEAD-2026-001"
  }
}
```

---

## 19. Additional Security & Account Templates (Legacy)

> These use camelCase IDs for backwards compatibility. Pass as `templateId` or `template`.

### `welcomeEmailTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "welcomeEmailTemplate",
  "data": {
    "username": "Alice"
  }
}
```

### `passwordExpiryReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "passwordExpiryReminderTemplate",
  "data": {
    "username": "alice_smith",
    "resetLink": "https://app.com/reset-password"
  }
}
```

### `accountDeactivationWarningTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountDeactivationWarningTemplate",
  "data": {
    "username": "alice_smith",
    "reactivateLink": "https://app.com/account/reactivate"
  }
}
```

### `accountReactivatedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountReactivatedTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `twoFactorCompletedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "twoFactorCompletedTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `newDeviceApprovalTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "newDeviceApprovalTemplate",
  "data": {
    "username": "alice_smith",
    "device": "Chrome on MacBook Pro",
    "approveLink": "https://app.com/devices/approve?token=tok_abc",
    "denyLink": "https://app.com/devices/deny?token=tok_abc"
  }
}
```

### `emailChangedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "emailChangedTemplate",
  "data": {
    "username": "alice_smith",
    "oldEmail": "alice_old@example.com",
    "newEmail": "alice_new@example.com"
  }
}
```

### `loginAlertTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "loginAlertTemplate",
  "data": {
    "username": "alice_smith",
    "device": "Chrome on Windows",
    "location": "London, UK",
    "time": "2026-04-13T10:00:00Z"
  }
}
```

### `sessionExpiredTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "sessionExpiredTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `accountRecoveryTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountRecoveryTemplate",
  "data": {
    "username": "alice_smith",
    "recoveryLink": "https://app.com/account/recover?token=rec_abc"
  }
}
```

### `accountReactivationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountReactivationTemplate",
  "data": {
    "username": "alice_smith",
    "reactivateLink": "https://app.com/account/reactivate?token=react_abc"
  }
}
```

### `accountSuspendedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountSuspendedTemplate",
  "data": {
    "username": "alice_smith",
    "reason": "Suspicious activity detected",
    "supportLink": "https://app.com/support"
  }
}
```

### `consentRequiredTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "consentRequiredTemplate",
  "data": {
    "username": "alice_smith",
    "consentLink": "https://app.com/consent"
  }
}
```

### `securitySettingsUpdatedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "securitySettingsUpdatedTemplate",
  "data": {
    "username": "alice_smith",
    "setting": "Two-factor authentication enabled"
  }
}
```

### `failedLoginAttemptsTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "failedLoginAttemptsTemplate",
  "data": {
    "username": "alice_smith",
    "attempts": 4,
    "lockLink": "https://app.com/account/unlock"
  }
}
```

### `accountVerifiedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountVerifiedTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `trustedDeviceAddedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "trustedDeviceAddedTemplate",
  "data": {
    "username": "alice_smith",
    "device": "Chrome on MacBook Pro",
    "location": "London, UK"
  }
}
```

### `phoneVerificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "phoneVerificationTemplate",
  "data": {
    "username": "alice_smith",
    "phone": "+44-7700-900123",
    "verificationCode": "847291",
    "expiryMinutes": 10
  }
}
```

### `emailPhoneVerificationReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "emailPhoneVerificationReminderTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `phoneNumberChangeRequestTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "phoneNumberChangeRequestTemplate",
  "data": {
    "username": "alice_smith",
    "newPhone": "+44-7700-900456",
    "confirmationCode": "392810",
    "expiryMinutes": 10
  }
}
```

### `phoneNumberChangeConfirmationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "phoneNumberChangeConfirmationTemplate",
  "data": {
    "username": "alice_smith",
    "updatedPhone": "+44-7700-900456"
  }
}
```

### `dataExportReadyTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "dataExportReadyTemplate",
  "data": {
    "username": "alice_smith",
    "downloadLink": "https://app.com/export/download?token=exp_abc"
  }
}
```

### `dataExportRequestTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "dataExportRequestTemplate",
  "data": {
    "username": "alice_smith",
    "requestDate": "2026-04-13"
  }
}
```

### `privacyPolicyUpdateTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "privacyPolicyUpdateTemplate",
  "data": {
    "username": "alice_smith",
    "policyLink": "https://app.com/privacy"
  }
}
```

### `termsOfServiceUpdateTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "termsOfServiceUpdateTemplate",
  "data": {
    "username": "alice_smith",
    "termsLink": "https://app.com/terms"
  }
}
```

### `policyUpdateTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "policyUpdateTemplate",
  "data": {
    "username": "alice_smith",
    "policyLink": "https://app.com/policies"
  }
}
```

### `loginAttemptLimitExceededTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "loginAttemptLimitExceededTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `twoFactorEnabledDisabledNotificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "twoFactorEnabledDisabledNotificationTemplate",
  "data": {
    "username": "alice_smith",
    "status": "enabled"
  }
}
```

### `accountVerificationReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountVerificationReminderTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `accountSecurityAuditCompletedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountSecurityAuditCompletedTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `backupEmailAddedRemovedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "backupEmailAddedRemovedTemplate",
  "data": {
    "username": "alice_smith",
    "action": "added"
  }
}
```

### `trustedDeviceManagementUpdateTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "trustedDeviceManagementUpdateTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `multiFactorAuthenticationSetupReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "multiFactorAuthenticationSetupReminderTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `secondaryPhoneVerificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "secondaryPhoneVerificationTemplate",
  "data": {
    "username": "alice_smith",
    "verificationCode": "738291",
    "expiryMinutes": 10
  }
}
```

### `identityVerificationRequestTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "identityVerificationRequestTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `identityVerificationResultTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "identityVerificationResultTemplate",
  "data": {
    "username": "alice_smith",
    "result": "verified"
  }
}
```

### `accountAccessRevokedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountAccessRevokedTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `passwordStrengthWarningTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "passwordStrengthWarningTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `accountMergeConfirmationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountMergeConfirmationTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `socialLoginConnectionTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "socialLoginConnectionTemplate",
  "data": {
    "username": "alice_smith",
    "action": "connected"
  }
}
```

### `reviewRequestTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "reviewRequestTemplate",
  "data": {
    "username": "alice_smith",
    "product": "Blue T-Shirt",
    "reviewLink": "https://app.com/reviews/new?orderId=ORD-001"
  }
}
```

### `paymentRefundedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "paymentRefundedTemplate",
  "data": {
    "username": "alice_smith",
    "amount": "$49.99",
    "refundDate": "2026-04-14"
  }
}
```

### `otpForLoginTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "otpForLoginTemplate",
  "data": {
    "username": "alice_smith",
    "otp": "847291",
    "expiryMinutes": 5
  }
}
```

### `failedLoginAttemptWarningTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "failedLoginAttemptWarningTemplate",
  "data": {
    "username": "alice_smith",
    "attempts": 3
  }
}
```

### `sessionTimeoutNotificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "sessionTimeoutNotificationTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `fraudulentTransactionAlertTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "fraudulentTransactionAlertTemplate",
  "data": {
    "username": "alice_smith",
    "transactionId": "txn_abc123",
    "amount": "$299.99"
  }
}
```

### `accountSecurityCheckReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "accountSecurityCheckReminderTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

---

## 20. Additional Cart & Wishlist Templates (Legacy)

### `wishlistReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "wishlistReminderTemplate",
  "data": {
    "username": "alice_smith",
    "wishlistItems": [
      { "name": "Blue T-Shirt", "price": "$25.00" },
      { "name": "Red Hoodie", "price": "$45.00" }
    ]
  }
}
```

### `wishlistBackInStockTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "wishlistBackInStockTemplate",
  "data": {
    "username": "alice_smith",
    "itemName": "Blue T-Shirt"
  }
}
```

### `wishlistPriceDropAlertTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "wishlistPriceDropAlertTemplate",
  "data": {
    "username": "alice_smith",
    "itemName": "Blue T-Shirt",
    "newPrice": "$19.99"
  }
}
```

### `savedForLaterReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "savedForLaterReminderTemplate",
  "data": {
    "username": "alice_smith",
    "savedItems": [
      { "name": "Blue T-Shirt", "price": "$25.00" }
    ]
  }
}
```

### `cartItemPriceChangedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "cartItemPriceChangedTemplate",
  "data": {
    "username": "alice_smith",
    "itemName": "Blue T-Shirt",
    "oldPrice": "$30.00",
    "newPrice": "$25.00"
  }
}
```

### `wishlistItemDiscontinuedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "wishlistItemDiscontinuedTemplate",
  "data": {
    "username": "alice_smith",
    "itemName": "Blue T-Shirt"
  }
}
```

### `cartExpiryNotificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "cartExpiryNotificationTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `abandonedBrowseReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "abandonedBrowseReminderTemplate",
  "data": {
    "username": "alice_smith",
    "items": [
      { "name": "Blue T-Shirt", "price": "$25.00", "url": "https://shop.com/products/shirt" }
    ]
  }
}
```

---

## 21. Additional Order Templates (Legacy)

### `orderProcessingTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderProcessingTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `orderPackedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderPackedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `orderOutForDeliveryTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderOutForDeliveryTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `partialOrderShippedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "partialOrderShippedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `orderSplitShipmentTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderSplitShipmentTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `deliveryDelayedNotificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "deliveryDelayedNotificationTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `orderCanceledByCustomerTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderCanceledByCustomerTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `orderCanceledByStoreTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderCanceledByStoreTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "reason": "Item out of stock"
  }
}
```

### `preOrderConfirmationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "preOrderConfirmationTemplate",
  "data": {
    "username": "alice_smith",
    "productName": "iPhone 17 Pro",
    "releaseDate": "2026-09-15"
  }
}
```

### `preOrderShippedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "preOrderShippedTemplate",
  "data": {
    "username": "alice_smith",
    "productName": "iPhone 17 Pro"
  }
}
```

### `digitalDownloadReadyTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "digitalDownloadReadyTemplate",
  "data": {
    "username": "alice_smith",
    "downloadLink": "https://app.com/downloads/file?token=dl_abc"
  }
}
```

### `customOrderConfirmedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "customOrderConfirmedTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `orderModificationRequestReceivedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderModificationRequestReceivedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `orderModificationResultTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "orderModificationResultTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "status": "approved"
  }
}
```

### `returnRequestReceivedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "returnRequestReceivedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `returnApprovedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "returnApprovedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "instructions": "Pack the item securely and drop off at any UPS location within 7 days."
  }
}
```

### `returnRejectedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "returnRejectedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "reason": "Return window of 30 days has passed."
  }
}
```

### `refundProcessedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "refundProcessedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `exchangeApprovedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "exchangeApprovedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "nextSteps": "Return your original item within 7 days using the enclosed label."
  }
}
```

### `exchangeRejectedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "exchangeRejectedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "reason": "Requested size is currently unavailable."
  }
}
```

### `returnShipmentReceivedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "returnShipmentReceivedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `partialRefundProcessedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "partialRefundProcessedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "details": "Partial refund of $15.00 issued for damaged item."
  }
}
```

---

## 22. Additional Payment & Subscription Templates (Legacy)

### `paymentSuccessfulTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "paymentSuccessfulTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001",
    "amount": "$49.99"
  }
}
```

### `paymentMethodExpiringSoonTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "paymentMethodExpiringSoonTemplate",
  "data": {
    "username": "alice_smith",
    "expiryDate": "2026-06-30"
  }
}
```

### `subscriptionStartedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "subscriptionStartedTemplate",
  "data": {
    "username": "alice_smith",
    "subscriptionName": "Pro Plan",
    "startDate": "2026-04-13"
  }
}
```

### `subscriptionRenewedSuccessfullyTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "subscriptionRenewedSuccessfullyTemplate",
  "data": {
    "username": "alice_smith",
    "subscriptionName": "Pro Plan"
  }
}
```

### `subscriptionFailedRetryNeededTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "subscriptionFailedRetryNeededTemplate",
  "data": {
    "username": "alice_smith",
    "subscriptionName": "Pro Plan"
  }
}
```

### `subscriptionCanceledTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "subscriptionCanceledTemplate",
  "data": {
    "username": "alice_smith",
    "subscriptionName": "Pro Plan"
  }
}
```

### `creditNoteIssuedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "creditNoteIssuedTemplate",
  "data": {
    "username": "alice_smith",
    "creditNoteNumber": "CN-2026-001",
    "amount": "$25.00",
    "issueDate": "2026-04-13"
  }
}
```

### `giftCardPurchasedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "giftCardPurchasedTemplate",
  "data": {
    "username": "alice_smith",
    "giftCardCode": "GIFT-XMAS-4892",
    "amount": "$50.00"
  }
}
```

### `giftCardRedeemedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "giftCardRedeemedTemplate",
  "data": {
    "username": "alice_smith",
    "giftCardCode": "GIFT-XMAS-4892",
    "amount": "$50.00"
  }
}
```

### `storeCreditAddedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "storeCreditAddedTemplate",
  "data": {
    "username": "alice_smith",
    "amount": "$15.00"
  }
}
```

### `storeCreditUsedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "storeCreditUsedTemplate",
  "data": {
    "username": "alice_smith",
    "amount": "$15.00"
  }
}
```

### `emiPaymentReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "emiPaymentReminderTemplate",
  "data": {
    "username": "alice_smith",
    "dueDate": "2026-04-20"
  }
}
```

### `paymentDisputeNotificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "paymentDisputeNotificationTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `paymentDisputeResolvedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "paymentDisputeResolvedTemplate",
  "data": {
    "username": "alice_smith",
    "orderId": "ORD-001"
  }
}
```

### `paymentMethodUpdatedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "paymentMethodUpdatedTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `subscriptionPauseConfirmationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "subscriptionPauseConfirmationTemplate",
  "data": {
    "username": "alice_smith",
    "subscriptionName": "Pro Plan"
  }
}
```

---

## 23. Additional Marketing & Loyalty Templates (Legacy)

### `onboardingSeriesTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "onboardingSeriesTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `customerMilestoneTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "customerMilestoneTemplate",
  "data": {
    "username": "alice_smith",
    "period": "1 Year"
  }
}
```

### `loyaltyPointsRedeemedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "loyaltyPointsRedeemedTemplate",
  "data": {
    "username": "alice_smith",
    "points": 500
  }
}
```

### `loyaltyPointsExpiryReminderTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "loyaltyPointsExpiryReminderTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `referralInvitationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "referralInvitationTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `referralBonusEarnedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "referralBonusEarnedTemplate",
  "data": {
    "username": "alice_smith",
    "bonus": "$10 credit"
  }
}
```

### `referralBonusUsedTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "referralBonusUsedTemplate",
  "data": {
    "username": "alice_smith",
    "bonus": "$10 credit"
  }
}
```

### `seasonalSaleAnnouncementTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "seasonalSaleAnnouncementTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `flashSaleTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "flashSaleTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `earlyAccessToSaleTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "earlyAccessToSaleTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `sneakPeekTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "sneakPeekTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `exclusiveEventTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "exclusiveEventTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `surveyRequestTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "surveyRequestTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `holidayGreetingsTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "holidayGreetingsTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `csrStoriesTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "csrStoriesTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `appDownloadInvitationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "appDownloadInvitationTemplate",
  "data": {
    "username": "alice_smith"
  }
}
```

### `loyaltyTierChangeTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "loyaltyTierChangeTemplate",
  "data": {
    "username": "alice_smith",
    "change": "Gold → Platinum"
  }
}
```

---

## 24. Additional System Templates (Legacy)

### `systemMaintenanceNotificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "systemMaintenanceNotificationTemplate",
  "data": {
    "username": "alice_smith",
    "startTime": "2026-04-20T02:00:00Z",
    "endTime": "2026-04-20T04:00:00Z"
  }
}
```

### `scheduledDowntimeNotificationTemplate`

```json
{
  "to": "user@example.com",
  "templateId": "scheduledDowntimeNotificationTemplate",
  "data": {
    "username": "alice_smith",
    "downtimeStart": "2026-04-20T02:00:00Z",
    "downtimeEnd": "2026-04-20T04:00:00Z"
  }
}
```

---

## 25. Admin Notification Templates

> Admin templates are sent to internal staff/admins. Provide `adminName` in `data` to personalise.

### `fraudulentActivityDetectedAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "fraudulentActivityDetectedAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "activityDetails": "Multiple failed logins followed by successful login from new country."
  }
}
```

### `newOrderPlacedAdminTemplate`

```json
{
  "to": "orders@company.com",
  "templateId": "newOrderPlacedAdminTemplate",
  "data": {
    "adminName": "Operations Team",
    "orderId": "ORD-001",
    "customerName": "Bob Customer",
    "total": "$89.97"
  }
}
```

### `highValueOrderAlertAdminTemplate`

```json
{
  "to": "sales@company.com",
  "templateId": "highValueOrderAlertAdminTemplate",
  "data": {
    "adminName": "Sales Team",
    "orderId": "ORD-001",
    "amount": "$4,500.00"
  }
}
```

### `lowStockAlertAdminTemplate`

```json
{
  "to": "inventory@company.com",
  "templateId": "lowStockAlertAdminTemplate",
  "data": {
    "adminName": "Inventory Team",
    "productId": "prod_abc",
    "productName": "Blue T-Shirt",
    "currentStock": 5
  }
}
```

### `outOfStockNotificationAdminTemplate`

```json
{
  "to": "inventory@company.com",
  "templateId": "outOfStockNotificationAdminTemplate",
  "data": {
    "adminName": "Inventory Team",
    "productId": "prod_abc",
    "productName": "Blue T-Shirt"
  }
}
```

### `productDisabledAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "productDisabledAdminTemplate",
  "data": {
    "adminName": "Admin",
    "productId": "prod_abc",
    "productName": "Blue T-Shirt"
  }
}
```

### `newReviewSubmittedAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "newReviewSubmittedAdminTemplate",
  "data": {
    "adminName": "Admin",
    "productName": "Blue T-Shirt",
    "reviewId": "rev_abc"
  }
}
```

### `paymentDisputeAlertAdminTemplate`

```json
{
  "to": "billing@company.com",
  "templateId": "paymentDisputeAlertAdminTemplate",
  "data": {
    "adminName": "Billing Team",
    "orderId": "ORD-001"
  }
}
```

### `returnRequestNotificationAdminTemplate`

```json
{
  "to": "operations@company.com",
  "templateId": "returnRequestNotificationAdminTemplate",
  "data": {
    "adminName": "Operations Team",
    "orderId": "ORD-001"
  }
}
```

### `refundProcessedNotificationAdminTemplate`

```json
{
  "to": "billing@company.com",
  "templateId": "refundProcessedNotificationAdminTemplate",
  "data": {
    "adminName": "Billing Team",
    "orderId": "ORD-001"
  }
}
```

### `dailySalesReportAdminTemplate`

```json
{
  "to": "management@company.com",
  "templateId": "dailySalesReportAdminTemplate",
  "data": {
    "adminName": "Management",
    "reportDate": "2026-04-12",
    "totalSales": "$8,420.00"
  }
}
```

### `weeklyMonthlySalesReportAdminTemplate`

```json
{
  "to": "management@company.com",
  "templateId": "weeklyMonthlySalesReportAdminTemplate",
  "data": {
    "adminName": "Management",
    "period": "Week of April 7–13, 2026",
    "totalSales": "$52,180.00"
  }
}
```

### `systemErrorFailedJobAlertAdminTemplate`

```json
{
  "to": "devops@company.com",
  "templateId": "systemErrorFailedJobAlertAdminTemplate",
  "data": {
    "adminName": "DevOps Team",
    "errorDetails": "Job: send-weekly-digest — Error: SMTP timeout after 30s"
  }
}
```

### `customerSupportTicketCreatedAdminTemplate`

```json
{
  "to": "support@company.com",
  "templateId": "customerSupportTicketCreatedAdminTemplate",
  "data": {
    "adminName": "Support Team",
    "ticketId": "TKT-2026-001",
    "customerName": "Bob Customer"
  }
}
```

### `inventoryRestockNotificationAdminTemplate`

```json
{
  "to": "inventory@company.com",
  "templateId": "inventoryRestockNotificationAdminTemplate",
  "data": {
    "adminName": "Inventory Team",
    "productName": "Blue T-Shirt",
    "productId": "prod_abc"
  }
}
```

### `bulkOrderRequestAdminTemplate`

```json
{
  "to": "sales@company.com",
  "templateId": "bulkOrderRequestAdminTemplate",
  "data": {
    "adminName": "Sales Team",
    "requestId": "BULK-2026-001",
    "requesterName": "Bob Corporate"
  }
}
```

### `customerDataDeletionRequestAdminTemplate`

```json
{
  "to": "privacy@company.com",
  "templateId": "customerDataDeletionRequestAdminTemplate",
  "data": {
    "adminName": "Privacy Team",
    "userName": "alice_smith",
    "userId": "usr_123"
  }
}
```

### `suspiciousAccountActivityAlertAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "suspiciousAccountActivityAlertAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "details": "Login from 3 different countries within 2 hours."
  }
}
```

### `multipleFailedLoginAttemptsAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "multipleFailedLoginAttemptsAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "attempts": 8
  }
}
```

### `accountSuspensionReinstatementNotificationAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "accountSuspensionReinstatementNotificationAdminTemplate",
  "data": {
    "adminName": "Admin",
    "userName": "alice_smith",
    "userId": "usr_123",
    "action": "suspended"
  }
}
```

### `userProfileUpdateAlertAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "userProfileUpdateAlertAdminTemplate",
  "data": {
    "adminName": "Admin",
    "userName": "alice_smith",
    "userId": "usr_123",
    "changes": "Email changed, phone number updated"
  }
}
```

### `twoFactorStatusChangeAlertAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "twoFactorStatusChangeAlertAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "status": "disabled"
  }
}
```

### `accountDeletionRequestDeniedAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "accountDeletionRequestDeniedAdminTemplate",
  "data": {
    "adminName": "Admin",
    "userName": "alice_smith",
    "userId": "usr_123",
    "reason": "Active subscription — cannot delete until subscription ends"
  }
}
```

### `unusualAccountLoginPatternAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "unusualAccountLoginPatternAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "details": "Logins from 5 different IPs in 30 minutes."
  }
}
```

### `phoneVerificationStatusUpdateAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "phoneVerificationStatusUpdateAdminTemplate",
  "data": {
    "adminName": "Admin",
    "userName": "alice_smith",
    "userId": "usr_123",
    "status": "verified"
  }
}
```

### `emailVerificationFailureAlertAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "emailVerificationFailureAlertAdminTemplate",
  "data": {
    "adminName": "Admin",
    "userName": "alice_smith",
    "userId": "usr_123",
    "attempts": 5
  }
}
```

### `secondaryPhoneVerificationStatusUpdateAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "secondaryPhoneVerificationStatusUpdateAdminTemplate",
  "data": {
    "adminName": "Admin",
    "userName": "alice_smith",
    "userId": "usr_123",
    "status": "verified"
  }
}
```

### `identityVerificationRequestReceivedAdminTemplate`

```json
{
  "to": "compliance@company.com",
  "templateId": "identityVerificationRequestReceivedAdminTemplate",
  "data": {
    "adminName": "Compliance Team",
    "userName": "alice_smith",
    "userId": "usr_123"
  }
}
```

### `identityVerificationOutcomeNotificationAdminTemplate`

```json
{
  "to": "compliance@company.com",
  "templateId": "identityVerificationOutcomeNotificationAdminTemplate",
  "data": {
    "adminName": "Compliance Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "result": "verified"
  }
}
```

### `accountAccessRevocationAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "accountAccessRevocationAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123"
  }
}
```

### `socialLoginConnectionAlertAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "socialLoginConnectionAlertAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "action": "connected Google"
  }
}
```

### `accountMergeRequestReceivedAdminTemplate`

```json
{
  "to": "admin@company.com",
  "templateId": "accountMergeRequestReceivedAdminTemplate",
  "data": {
    "adminName": "Admin",
    "userName": "alice_smith",
    "userId": "usr_123"
  }
}
```

### `highRiskAccountActivityAlertAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "highRiskAccountActivityAlertAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123",
    "details": "Large withdrawal attempt followed by account info change."
  }
}
```

### `accountRecoveryRequestReceivedAdminTemplate`

```json
{
  "to": "security@company.com",
  "templateId": "accountRecoveryRequestReceivedAdminTemplate",
  "data": {
    "adminName": "Security Team",
    "userName": "alice_smith",
    "userId": "usr_123"
  }
}
```
