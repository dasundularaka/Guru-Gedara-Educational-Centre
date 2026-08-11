/**
 * Gmail Service for sending automated payment reminder emails via Google Gmail API
 */

export interface EmailReminderPayload {
  to: string;
  studentName: string;
  classTitle: string;
  amount: number;
  dueDate: string;
  calendarEventTitle: string;
  calendarEventDate: string;
}

/**
 * Encodes a string to URL-safe base64 RFC 822 format for Gmail API
 */
function createRawEmail(to: string, subject: string, htmlBody: string): string {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody
  ];

  const emailText = emailLines.join('\r\n');
  
  return btoa(unescape(encodeURIComponent(emailText)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email using Google Gmail API
 */
export const sendGmailEmail = async (
  accessToken: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ id: string; threadId: string }> => {
  const raw = createRawEmail(toEmail, subject, htmlContent);

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gmail API dispatch failed (${response.status})`);
  }

  return await response.json();
};

/**
 * Generate formal HTML template for Payment Reminder
 */
export const buildPaymentReminderHtml = (payload: EmailReminderPayload): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e7ff; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 20px; border-radius: 8px; color: #ffffff; text-align: center;">
        <h2 style="margin: 0; font-size: 22px;">Guru Gedara Educational Portal</h2>
        <p style="margin: 6px 0 0 0; opacity: 0.8; font-size: 13px;">Automated Tuition Payment Reminder</p>
      </div>

      <div style="padding: 20px 0;">
        <p style="font-size: 15px; color: #1e293b;">Dear <strong>${payload.studentName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          This is an automated payment reminder triggered by your scheduled Google Calendar course event: 
          <strong style="color: #312e81;">${payload.calendarEventTitle}</strong>.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Enrolled Course:</td>
              <td style="padding: 6px 0; text-align: right;">${payload.classTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Google Calendar Event Date:</td>
              <td style="padding: 6px 0; text-align: right; color: #2563eb;">${payload.calendarEventDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Payment Due Date:</td>
              <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: bold;">${payload.dueDate}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 10px 0 0 0; font-weight: bold; font-size: 16px;">Tuition Amount Due:</td>
              <td style="padding: 10px 0 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #059669;">LKR ${payload.amount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Please log into your Guru Gedara Student Portal to settle this invoice prior to the class session date to maintain uninterrupted access to learning materials and live lectures.
        </p>
      </div>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">Guru Gedara Automated Payment Reminder System &bull; Powered by Google Calendar & Gmail</p>
      </div>
    </div>
  `;
};
