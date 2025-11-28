/**
 * Order Success Email Template
 * Template for successful order confirmations
 */
module.exports = function render(data) {
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

  const subject = `Order Confirmation #${orderNumber} - Thank you for your purchase!`;

  const formatCurrency = (amount, curr) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(amount);
  };

  const renderItems = () => {
    return items
      .map(
        item => `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 15px; text-align: left;">
          <strong>${item.name}</strong>
          ${item.variant ? `<br><small style="color: #666;">${item.variant}</small>` : ''}
        </td>
        <td style="padding: 15px; text-align: center;">${item.quantity}</td>
        <td style="padding: 15px; text-align: right;">${formatCurrency(item.price, currency)}</td>
      </tr>
    `
      )
      .join('');
  };

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
          border-bottom: 2px solid #16a34a;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #16a34a;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .order-number {
          font-size: 18px;
          color: #16a34a;
          font-weight: 600;
          background-color: #f0fdf4;
          padding: 10px 20px;
          border-radius: 6px;
          display: inline-block;
        }
        .content {
          font-size: 16px;
          margin-bottom: 30px;
        }
        .order-summary {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .order-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .order-table th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e5e5e5;
        }
        .order-total {
          background-color: #16a34a;
          color: white;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0;
        }
        .info-section {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #16a34a;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 10px 5px;
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
          color: #16a34a;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${companyName}</div>
          <h1 class="title">Order Confirmed! 🎉</h1>
          <div class="order-number">Order #${orderNumber}</div>
        </div>
        
        <div class="content">
          <p>Hi <span class="highlight">${username}</span>,</p>
          
          <p>Thank you for your purchase! We're excited to confirm that your order has been received and is being processed.</p>
          
          <div class="order-summary">
            <h3>Order Summary</h3>
            <table class="order-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${renderItems()}
              </tbody>
            </table>
            
            <div class="order-total">
              Total: ${formatCurrency(orderTotal, currency)}
            </div>
          </div>
          
          ${
            shippingAddress
              ? `
            <div class="info-section">
              <h4>📦 Shipping Address</h4>
              <p>${shippingAddress.name}<br>
              ${shippingAddress.street}<br>
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}<br>
              ${shippingAddress.country}</p>
            </div>
          `
              : ''
          }
          
          ${
            estimatedDelivery
              ? `
            <div class="info-section">
              <h4>🚚 Delivery Information</h4>
              <p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>
              <p>You'll receive a tracking notification once your order ships.</p>
            </div>
          `
              : ''
          }
          
          <div style="text-align: center; margin: 30px 0;">
            ${trackingUrl ? `<a href="${trackingUrl}" class="cta-button">Track Your Order</a>` : ''}
            <a href="#" class="cta-button" style="background-color: #3b82f6;">View Order Details</a>
          </div>
          
          <p><strong>What's next?</strong></p>
          <ul>
            <li>We'll send you a shipping confirmation with tracking details</li>
            <li>You can track your order status in your account</li>
            <li>Our customer service team is here if you need any help</li>
          </ul>
          
          <p>Thank you for choosing ${companyName}. We appreciate your business!</p>
          
          <p>Best regards,<br>The ${companyName} Team</p>
        </div>
        
        <div class="footer">
          <p>Order confirmation sent to ${email}</p>
          <p>Questions? Contact us at support@company.com</p>
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Order Confirmation #${orderNumber} - ${companyName}

Hi ${username},

Thank you for your purchase! We're excited to confirm that your order has been received and is being processed.

ORDER SUMMARY:
${items.map(item => `- ${item.name} ${item.variant || ''} (x${item.quantity}) - ${formatCurrency(item.price, currency)}`).join('\n')}

Total: ${formatCurrency(orderTotal, currency)}

${
  shippingAddress
    ? `
SHIPPING ADDRESS:
${shippingAddress.name}
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}
${shippingAddress.country}
`
    : ''
}

${estimatedDelivery ? `ESTIMATED DELIVERY: ${estimatedDelivery}` : ''}

${trackingUrl ? `Track your order: ${trackingUrl}` : ''}

WHAT'S NEXT:
- We'll send you a shipping confirmation with tracking details
- You can track your order status in your account  
- Our customer service team is here if you need any help

Thank you for choosing ${companyName}. We appreciate your business!

Best regards,
The ${companyName} Team

---
Order confirmation sent to ${email}
Questions? Contact us at support@company.com
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;

  return { subject, html, text };
};
