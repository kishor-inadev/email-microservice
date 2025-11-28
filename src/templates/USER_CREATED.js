/**
 * User Created Email Template
 * Template for welcoming new users
 */
module.exports = function render(data) {
  const { username, email, activationUrl, companyName = 'Company' } = data;
  
  const subject = `Welcome to ${companyName}, ${username}!`;
  
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
          color: #2563eb;
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
          background-color: #2563eb;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
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
          color: #2563eb;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${companyName}</div>
          <h1 class="title">Welcome aboard, ${username}! 🎉</h1>
        </div>
        
        <div class="content">
          <p>Hi <span class="highlight">${username}</span>,</p>
          
          <p>We're thrilled to have you join our community! Your account has been successfully created with the email address <strong>${email}</strong>.</p>
          
          <p>To get started and activate your account, please click the button below:</p>
          
          <div style="text-align: center;">
            ${activationUrl ? `<a href="${activationUrl}" class="cta-button">Activate Your Account</a>` : ''}
          </div>
          
          <p>Here's what you can do next:</p>
          <ul>
            <li>Complete your profile setup</li>
            <li>Explore our features and tools</li>
            <li>Connect with other users in the community</li>
            <li>Check out our getting started guide</li>
          </ul>
          
          <p>If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help!</p>
          
          <p>Best regards,<br>The ${companyName} Team</p>
        </div>
        
        <div class="footer">
          <p>This email was sent to ${email}. If you didn't create an account, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Welcome to ${companyName}, ${username}!

Hi ${username},

We're thrilled to have you join our community! Your account has been successfully created with the email address ${email}.

${activationUrl ? `To get started and activate your account, please visit: ${activationUrl}` : ''}

Here's what you can do next:
- Complete your profile setup
- Explore our features and tools
- Connect with other users in the community
- Check out our getting started guide

If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help!

Best regards,
The ${companyName} Team

---
This email was sent to ${email}. If you didn't create an account, please ignore this email.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;
  
  return { subject, html, text };
};