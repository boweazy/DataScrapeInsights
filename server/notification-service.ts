import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface NotificationOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface Alert {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  data?: Record<string, any>;
}

let transporter: Transporter | null = null;

// Initialize email transporter
export function initializeEmailTransporter(config?: EmailConfig) {
  if (config) {
    transporter = nodemailer.createTransport(config);
  } else {
    // Use ethereal email for development/testing
    nodemailer.createTestAccount().then(testAccount => {
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('[Notifications] Using Ethereal email for testing');
      console.log(`Preview URL: https://ethereal.email/messages`);
    });
  }
}

// Send email notification
export async function sendEmail(options: NotificationOptions): Promise<boolean> {
  if (!transporter) {
    console.warn('[Notifications] Email transporter not initialized');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: '"DataFlow Analytics" <noreply@dataflow.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || generateHtmlEmail(options.subject, options.text)
    });

    console.log('[Notifications] Email sent:', info.messageId);

    // Preview URL for ethereal
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Notifications] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('[Notifications] Error sending email:', error);
    return false;
  }
}

// Generate HTML email template
function generateHtmlEmail(subject: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
          color: #FFD700;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #fff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .footer {
          background: #f5f5f5;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          background: #FFD700;
          color: #1a1a2e;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚀 DataFlow Analytics</h1>
      </div>
      <div class="content">
        <h2>${subject}</h2>
        <p>${content}</p>
      </div>
      <div class="footer">
        <p>This is an automated message from DataFlow Analytics Platform</p>
        <p>&copy; ${new Date().getFullYear()} SmartFlow Systems. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

// Send alert notification
export async function sendAlert(email: string, alert: Alert): Promise<boolean> {
  const icons: Record<Alert['type'], string> = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };

  const icon = icons[alert.type];
  const subject = `${icon} ${alert.title}`;

  let htmlContent = `
    <div style="padding: 20px; background: ${getAlertColor(alert.type)}15; border-left: 4px solid ${getAlertColor(alert.type)}; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: ${getAlertColor(alert.type)};">${icon} ${alert.title}</h3>
      <p style="margin: 0;">${alert.message}</p>
  `;

  if (alert.data) {
    htmlContent += `
      <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; font-family: monospace; font-size: 12px;">
        <strong>Details:</strong><br>
        <pre style="margin: 5px 0;">${JSON.stringify(alert.data, null, 2)}</pre>
      </div>
    `;
  }

  htmlContent += '</div>';

  return sendEmail({
    to: email,
    subject,
    text: `${alert.title}\n\n${alert.message}${alert.data ? '\n\nDetails:\n' + JSON.stringify(alert.data, null, 2) : ''}`,
    html: generateHtmlEmail(alert.title, htmlContent)
  });
}

// Get alert color based on type
function getAlertColor(type: Alert['type']): string {
  const colors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  };
  return colors[type];
}

// Notification templates
export const NotificationTemplates = {
  scrapeCompleted: (scraperName: string, itemCount: number): Alert => ({
    type: 'success',
    title: 'Scrape Completed Successfully',
    message: `The scraper "${scraperName}" has completed successfully and collected ${itemCount} items.`,
    data: { scraperName, itemCount, timestamp: new Date().toISOString() }
  }),

  scrapeFailed: (scraperName: string, error: string): Alert => ({
    type: 'error',
    title: 'Scrape Failed',
    message: `The scraper "${scraperName}" encountered an error and failed to complete.`,
    data: { scraperName, error, timestamp: new Date().toISOString() }
  }),

  exportReady: (exportName: string, recordCount: number): Alert => ({
    type: 'success',
    title: 'Export Ready',
    message: `Your export "${exportName}" is ready for download with ${recordCount} records.`,
    data: { exportName, recordCount, timestamp: new Date().toISOString() }
  }),

  queryExecuted: (queryName: string, rowCount: number, executionTime: number): Alert => ({
    type: 'info',
    title: 'Query Executed',
    message: `Query "${queryName}" returned ${rowCount} rows in ${executionTime}ms.`,
    data: { queryName, rowCount, executionTime, timestamp: new Date().toISOString() }
  }),

  highErrorRate: (errorCount: number, timeWindow: string): Alert => ({
    type: 'warning',
    title: 'High Error Rate Detected',
    message: `${errorCount} errors detected in the last ${timeWindow}. Please review your configurations.`,
    data: { errorCount, timeWindow, timestamp: new Date().toISOString() }
  }),

  systemPerformance: (metric: string, value: number, threshold: number): Alert => ({
    type: 'warning',
    title: 'Performance Alert',
    message: `${metric} is at ${value}, which exceeds the threshold of ${threshold}.`,
    data: { metric, value, threshold, timestamp: new Date().toISOString() }
  })
};

// Initialize with environment variables or defaults
if (process.env.SMTP_HOST) {
  initializeEmailTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
} else {
  initializeEmailTransporter();
}
