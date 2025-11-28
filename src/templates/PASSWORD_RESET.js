/**
 * Password Reset Email Template
 * Template for password reset requests
 */
module.exports = function render(data) {
  const { username, email, resetUrl, expiryTime = '1 hour', companyName = 'Company' } = data;
  
  const subject = `Reset your ${companyName} password`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #dc2626;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .content {
          font-size: 16px;
          margin-bottom: 30px;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #dc2626;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .warning-box {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        .highlight {
          color: #dc2626;
          font-weight: 600;
        }
        .code {
          font-family: monospace;
          background-color: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${companyName}</div>
          <h1 class="title">Password Reset Request 🔐</h1>
        </div>
        
        <div class="content">
          <p>Hi <span class="highlight">${username}</span>,</p>
          
          <p>We received a request to reset the password for your ${companyName} account (<strong>${email}</strong>).</p>
          
          <p>To reset your password, click the button below:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="cta-button">Reset Your Password</a>
          </div>
          
          <div class="warning-box">
            <strong>⚠️ Important Security Information:</strong>
            <ul>
              <li>This link will expire in <strong>${expiryTime}</strong></li>
              <li>This link can only be used once</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password will remain unchanged until you create a new one</li>
            </ul>
          </div>
          
          <p>If you're having trouble clicking the button, you can copy and paste this URL into your browser:</p>
          <p class="code">${resetUrl}</p>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your account remains secure.</p>
          
          <p>Need help? Contact our support team - we're here to assist you.</p>
          
          <p>Best regards,<br>The ${companyName} Security Team</p>
        </div>
        
        <div class="footer">
          <p>This email was sent to ${email} because a password reset was requested for this account.</p>
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Password Reset Request - ${companyName}

Hi ${username},

We received a request to reset the password for your ${companyName} account (${email}).

To reset your password, please visit: ${resetUrl}

IMPORTANT SECURITY INFORMATION:
- This link will expire in ${expiryTime}
- This link can only be used once
- If you didn't request this reset, please ignore this email
- Your password will remain unchanged until you create a new one

If you didn't request a password reset, you can safely ignore this email. Your account remains secure.

Need help? Contact our support team - we're here to assist you.

Best regards,
The ${companyName} Security Team

---
This email was sent to ${email} because a password reset was requested for this account.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;
  
  return { subject, html, text };
};