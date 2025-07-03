import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface PasswordResetEmailData extends EmailTemplateData {
  firstName: string;
  resetUrl: string;
  expirationTime: string; // e.g., "1 hour"
  companyName?: string;
}

export class PasswordResetEmail extends BaseEmailTemplate<PasswordResetEmailData> {
  getSubject(): string {
    return 'Password Reset Request';
  }

  getHtml(): string {
    const content = `
      ${this.getHeader('Password Reset Request')}
      <div class="email-body">
        <p>Hi ${this.data.firstName},</p>
        <p>
          We received a request to reset your password. If you didn't make this request, 
          you can safely ignore this email.
        </p>
        <p>
          To reset your password, click the button below:
        </p>
        <div style="text-align: center;">
          <a href="${this.data.resetUrl}" class="button">Reset Your Password</a>
        </div>
        <p class="text-muted" style="margin-top: 20px;">
          Or copy and paste this link into your browser:
        </p>
        <p class="text-muted" style="word-break: break-all;">
          ${this.data.resetUrl}
        </p>
        <div class="divider"></div>
        <p>
          <strong>Important:</strong> This password reset link will expire in 
          <strong>${this.data.expirationTime}</strong>. After that, you'll need to 
          request a new password reset.
        </p>
        <p>
          For security reasons, we recommend that you:
        </p>
        <ul>
          <li>Use a strong, unique password</li>
          <li>Don't share your password with anyone</li>
          <li>Enable two-factor authentication if available</li>
        </ul>
        <p>
          If you didn't request this password reset, please contact our support team immediately.
        </p>
        <p>
          Best regards,<br>
          The ${this.data.companyName || 'Security Team'}
        </p>
      </div>
      ${this.getFooter(this.data.companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    return `
Password Reset Request

Hi ${this.data.firstName},

We received a request to reset your password. If you didn't make this request, you can safely ignore this email.

To reset your password, visit the following link:
${this.data.resetUrl}

Important: This password reset link will expire in ${this.data.expirationTime}. After that, you'll need to request a new password reset.

For security reasons, we recommend that you:
- Use a strong, unique password
- Don't share your password with anyone
- Enable two-factor authentication if available

If you didn't request this password reset, please contact our support team immediately.

Best regards,
The ${this.data.companyName || 'Security Team'}
    `.trim();
  }
}