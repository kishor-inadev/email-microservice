/**
 * Custom Generic Email Template
 * A flexible template for custom email content
 */
module.exports = function render(data) {
  const { 
    username,
    email,
    subject: customSubject,
    title,
    content,
    ctaText,
    ctaUrl,
    footerText,
    companyName = 'Company',
    theme = 'blue' // blue, green, red, purple, orange
  } = data;
  
  // Theme colors
  const themes = {
    blue: { primary: '#3b82f6', background: '#eff6ff', border: '#3b82f6' },
    green: { primary: '#16a34a', background: '#f0fdf4', border: '#16a34a' },
    red: { primary: '#dc2626', background: '#fef2f2', border: '#dc2626' },
    purple: { primary: '#9333ea', background: '#faf5ff', border: '#9333ea' },
    orange: { primary: '#ea580c', background: '#fff7ed', border: '#ea580c' }
  };
  
  const themeColors = themes[theme] || themes.blue;
  
  const subject = customSubject || `Message from ${companyName}`;
  
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
          padding-bottom: 20px;
          border-bottom: 2px solid ${themeColors.border};
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: ${themeColors.primary};
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
          white-space: pre-line;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 24px;
          background-color: ${themeColors.primary};
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .info-box {
          background-color: ${themeColors.background};
          border-left: 4px solid ${themeColors.primary};
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
          color: ${themeColors.primary};
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${companyName}</div>
          ${title ? `<h1 class="title">${title}</h1>` : ''}
        </div>
        
        <div class="content">
          ${username ? `<p>Hi <span class="highlight">${username}</span>,</p>` : ''}
          
          ${content ? `<div>${content}</div>` : '<p>This is a custom message from our team.</p>'}
          
          ${ctaText && ctaUrl ? `
            <div style="text-align: center;">
              <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
            </div>
          ` : ''}
          
          <p>If you have any questions, don't hesitate to reach out to our support team.</p>
          
          <p>Best regards,<br>The ${companyName} Team</p>
        </div>
        
        <div class="footer">
          ${footerText ? `<p>${footerText}</p>` : ''}
          ${email ? `<p>This email was sent to ${email}</p>` : ''}
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
${companyName}${title ? ` - ${title}` : ''}

${username ? `Hi ${username},` : 'Hello,'}

${content || 'This is a custom message from our team.'}

${ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}` : ''}

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The ${companyName} Team

${footerText || ''}
${email ? `This email was sent to ${email}` : ''}
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;
  
  return { subject, html, text };
};