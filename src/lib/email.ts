import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email send');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        name: process.env.SENDGRID_FROM_NAME || 'Hatdog'
      },
      subject,
      text: text || '',
      html: html || text || ''
    };

    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error?.response?.body || error);
    return { success: false, error: error?.message || 'Failed to send email' };
  }
}

// Email templates
export const emailTemplates = {
  taskAssigned: (assigneeName: string, taskTitle: string, assignerName: string, taskUrl?: string) => ({
    subject: `${taskTitle} - New task from ${assignerName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Hi ${assigneeName},
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          ${assignerName} assigned you a task in Hatdog:
        </p>
        <div style="background: #f8f9fa; padding: 16px; border-left: 4px solid #4F46E5; margin: 24px 0;">
          <strong style="color: #333; font-size: 18px;">${taskTitle}</strong>
        </div>
        ${taskUrl ? `
          <p style="margin: 24px 0;">
            <a href="${taskUrl}" style="color: #4F46E5; text-decoration: underline;">
              View task details →
            </a>
          </p>
        ` : ''}
        <p style="color: #999; font-size: 14px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
          This email was sent from Hatdog, your team's task management tool.
          <br>You received this because you're assigned to this task.
        </p>
      </div>
    `,
    text: `Hi ${assigneeName},\n\n${assignerName} assigned you a task: "${taskTitle}"\n\n${taskUrl ? `View details: ${taskUrl}` : ''}\n\n--\nThis email was sent from Hatdog, your team's task management tool.`
  }),

  taskUpdated: (assigneeName: string, taskTitle: string, updaterName: string, changes: string, taskUrl?: string) => ({
    subject: `Task Updated: ${taskTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hi ${assigneeName},</h2>
        <p style="color: #666; font-size: 16px;">
          ${updaterName} has updated a task assigned to you:
        </p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">${taskTitle}</h3>
          <p style="color: #666; margin: 10px 0 0 0;">${changes}</p>
        </div>
        ${taskUrl ? `
          <p style="margin-top: 20px;">
            <a href="${taskUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Task
            </a>
          </p>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 14px;">
          Sent by ${process.env.SENDGRID_FROM_NAME || 'Hatdog'}
        </p>
      </div>
    `,
    text: `Hi ${assigneeName},\n\n${updaterName} has updated a task assigned to you: "${taskTitle}"\n\nChanges: ${changes}\n\n${taskUrl ? `View it here: ${taskUrl}` : ''}`
  }),

  taskDueSoon: (assigneeName: string, taskTitle: string, dueDate: string, taskUrl?: string) => ({
    subject: `Task Due Soon: ${taskTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hi ${assigneeName},</h2>
        <p style="color: #666; font-size: 16px;">
          Your task is due soon:
        </p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="color: #333; margin-top: 0;">${taskTitle}</h3>
          <p style="color: #666; margin: 10px 0 0 0;">
            <strong>Due:</strong> ${dueDate}
          </p>
        </div>
        ${taskUrl ? `
          <p style="margin-top: 20px;">
            <a href="${taskUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Task
            </a>
          </p>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 14px;">
          Sent by ${process.env.SENDGRID_FROM_NAME || 'Hatdog'}
        </p>
      </div>
    `,
    text: `Hi ${assigneeName},\n\nYour task "${taskTitle}" is due on ${dueDate}.\n\n${taskUrl ? `View it here: ${taskUrl}` : ''}`
  }),

  taskCompleted: (recipientName: string, taskTitle: string, completedByName: string, taskUrl?: string) => ({
    subject: `✅ Task Completed: ${taskTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Hi ${recipientName},
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Great news! ${completedByName} has completed the task:
        </p>
        <div style="background: #f0fdf4; padding: 16px; border-left: 4px solid #22c55e; margin: 24px 0;">
          <strong style="color: #333; font-size: 18px;">✅ ${taskTitle}</strong>
        </div>
        ${taskUrl ? `
          <p style="margin: 24px 0;">
            <a href="${taskUrl}" style="color: #4F46E5; text-decoration: underline;">
              View task details →
            </a>
          </p>
        ` : ''}
        <p style="color: #999; font-size: 14px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
          This email was sent from Hatdog, your team's task management tool.
          <br>You received this because you created or were assigned to this task.
        </p>
      </div>
    `,
    text: `Hi ${recipientName},\n\nGreat news! ${completedByName} has completed the task: "${taskTitle}"\n\n${taskUrl ? `View details: ${taskUrl}` : ''}\n\n--\nThis email was sent from Hatdog, your team's task management tool.`
  })
};