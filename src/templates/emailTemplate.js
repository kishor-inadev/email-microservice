/**
 * Email Templates
 * 
 * This file contains all email templates used by the microservice.
 * Each template is a function that takes data and returns { subject, html, text }
 */

const templates = {
  /**
   * User Welcome Email Template
   */
  USER_CREATED: function(data) {
    const { username, email, activationUrl, companyName = 'Company' } = data;
    
    const subject = `Welcome to ${companyName}!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${companyName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${companyName}!</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Thank you for joining ${companyName}. We're excited to have you on board!</p>
              <p>Your account has been created with the email address: <strong>${email}</strong></p>
              ${activationUrl ? `
                <p>To get started, please activate your account by clicking the button below:</p>
                <a href="${activationUrl}" class="button">Activate Account</a>
                <p>Or copy and paste this link into your browser: ${activationUrl}</p>
              ` : ''}
              <p>If you have any questions, feel free to contact our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `
      Welcome to ${companyName}!
      
      Hello ${username}!
      
      Thank you for joining ${companyName}. We're excited to have you on board!
      
      Your account has been created with the email address: ${email}
      
      ${activationUrl ? `To get started, please activate your account by visiting: ${activationUrl}` : ''}
      
      If you have any questions, feel free to contact our support team.
      
      © 2024 ${companyName}. All rights reserved.
    `;
    
    return { subject, html, text };
  },

  /**
   * Password Reset Email Template
   */
  PASSWORD_RESET: function(data) {
    const { username, email, resetUrl, expiryTime = '1 hour', companyName = 'Company' } = data;
    
    const subject = `Reset your ${companyName} password`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - ${companyName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>We received a request to reset the password for your ${companyName} account (${email}).</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser: ${resetUrl}</p>
              <div class="warning">
                <strong>Important:</strong> This link will expire in ${expiryTime}. If you didn't request this password reset, please ignore this email.
              </div>
              <p>For security reasons, this link can only be used once.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `
      Password Reset Request - ${companyName}
      
      Hello ${username}!
      
      We received a request to reset the password for your ${companyName} account (${email}).
      
      To reset your password, visit: ${resetUrl}
      
      Important: This link will expire in ${expiryTime}. If you didn't request this password reset, please ignore this email.
      
      For security reasons, this link can only be used once.
      
      © 2024 ${companyName}. All rights reserved.
    `;
    
    return { subject, html, text };
  },

  /**
   * Order Success Email Template
   */
  ORDER_SUCCESS: function(data) {
    const { 
      username, 
      email, 
      orderNumber, 
      orderTotal, 
      currency = 'USD', 
      items = [], 
      shippingAddress,
      estimatedDelivery,
      trackingUrl,
      companyName = 'Company' 
    } = data;
    
    const subject = `Order Confirmation #${orderNumber} - ${companyName}`;
    
    const formatCurrency = (amount, curr) => {
      const symbols = { USD: '$', EUR: '€', GBP: '£' };
      return `${symbols[curr] || curr} ${amount.toFixed(2)}`;
    };
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price, currency)}</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation - ${companyName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-summary { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
            .total { font-size: 18px; font-weight: bold; color: #28a745; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; }
            .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Thank you for your order, ${username}!</h2>
              <p>Your order #${orderNumber} has been confirmed and is being processed.</p>
              
              <div class="order-summary">
                <h3>Order Summary</h3>
                ${items.length > 0 ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: right;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                ` : ''}
                <p class="total">Total: ${formatCurrency(orderTotal, currency)}</p>
              </div>
              
              ${shippingAddress ? `
                <div class="order-summary">
                  <h3>Shipping Address</h3>
                  <p>
                    ${shippingAddress.name}<br>
                    ${shippingAddress.street}<br>
                    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}<br>
                    ${shippingAddress.country}
                  </p>
                </div>
              ` : ''}
              
              ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
              
              ${trackingUrl ? `
                <p>You can track your order using the link below:</p>
                <a href="${trackingUrl}" class="button">Track Order</a>
              ` : ''}
              
              <p>We'll send you another email when your order ships.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const itemsText = items.map(item => 
      `${item.name} - Qty: ${item.quantity} - ${formatCurrency(item.price, currency)}`
    ).join('\n');
    
    const text = `
      Order Confirmed! - ${companyName}
      
      Thank you for your order, ${username}!
      
      Your order #${orderNumber} has been confirmed and is being processed.
      
      Order Summary:
      ${itemsText}
      Total: ${formatCurrency(orderTotal, currency)}
      
      ${shippingAddress ? `
      Shipping Address:
      ${shippingAddress.name}
      ${shippingAddress.street}
      ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}
      ${shippingAddress.country}
      ` : ''}
      
      ${estimatedDelivery ? `Estimated Delivery: ${estimatedDelivery}` : ''}
      ${trackingUrl ? `Track your order: ${trackingUrl}` : ''}
      
      We'll send you another email when your order ships.
      
      © 2024 ${companyName}. All rights reserved.
    `;
    
    return { subject, html, text };
  },

  /**
   * Custom Generic Template
   */
  CUSTOM_GENERIC_TEMPLATE: function(data) {
    const { 
      username, 
      email, 
      subject, 
      title, 
      content, 
      theme = 'blue',
      ctaText,
      ctaUrl,
      footerText,
      companyName = 'Company' 
    } = data;
    
    const themes = {
      blue: '#007bff',
      green: '#28a745',
      red: '#dc3545',
      purple: '#6f42c1',
      orange: '#fd7e14'
    };
    
    const themeColor = themes[theme] || themes.blue;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title || subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${themeColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: ${themeColor}; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title || subject}</h1>
            </div>
            <div class="content">
              ${username ? `<h2>Hello ${username}!</h2>` : ''}
              <div>${content}</div>
              ${ctaText && ctaUrl ? `
                <a href="${ctaUrl}" class="button">${ctaText}</a>
              ` : ''}
            </div>
            <div class="footer">
              ${footerText ? `<p>${footerText}</p>` : ''}
              <p>&copy; 2024 ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `
      ${title || subject}
      
      ${username ? `Hello ${username}!` : ''}
      
      ${content}
      
      ${ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}` : ''}
      
      ${footerText || ''}
      
      © 2024 ${companyName}. All rights reserved.
    `;
    
    return { subject, html, text };
  }
};

// Support both template and templateId
templates['user-welcome'] = templates.USER_CREATED;
templates['user-welcome-v2'] = templates.USER_CREATED;
templates['password-reset'] = templates.PASSWORD_RESET;
templates['password-reset-v1'] = templates.PASSWORD_RESET;
templates['order-confirmation'] = templates.ORDER_SUCCESS;
templates['order-success-v1'] = templates.ORDER_SUCCESS;
templates['custom-message'] = templates.CUSTOM_GENERIC_TEMPLATE;
templates['custom-message-v1'] = templates.CUSTOM_GENERIC_TEMPLATE;

module.exports = templates;