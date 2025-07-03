import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface PasswordChangeConfirmationEmailData extends EmailTemplateData {
  firstName: string;
  companyName?: string;
  supportEmail?: string;
}

export class PasswordChangeConfirmationEmail extends BaseEmailTemplate<PasswordChangeConfirmationEmailData> {
  getSubject(): string {
    return 'Your Password Has Been Changed';
  }

  getHtml(): string {
    const content = `
      ${this.getHeader('Password Changed Successfully')}
      <div class="email-body">
        <p>Hi ${this.data.firstName},</p>
        <p>
          This email confirms that your password has been successfully changed.
        </p>
        <p>
          If you made this change, no further action is required.
        </p>
        <div class="alert" style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Important:</strong> If you did not change your password, your account may be compromised. 
            Please contact our support team immediately at 
            ${this.data.supportEmail ? `<a href="mailto:${this.data.supportEmail}">${this.data.supportEmail}</a>` : 'support'}.
          </p>
        </div>
        <p>
          For your security, we recommend:
        </p>
        <ul>
          <li>Using a unique password for each of your online accounts</li>
          <li>Enabling two-factor authentication when available</li>
          <li>Regularly updating your passwords</li>
          <li>Never sharing your password with anyone</li>
        </ul>
        <p>
          Thank you for keeping your account secure.
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
Password Changed Successfully

Hi ${this.data.firstName},

This email confirms that your password has been successfully changed.

If you made this change, no further action is required.

Important: If you did not change your password, your account may be compromised. Please contact our support team immediately${this.data.supportEmail ? ` at ${this.data.supportEmail}` : ''}.

For your security, we recommend:
- Using a unique password for each of your online accounts
- Enabling two-factor authentication when available
- Regularly updating your passwords
- Never sharing your password with anyone

Thank you for keeping your account secure.

Best regards,
The ${this.data.companyName || 'Security Team'}
    `.trim();
  }
}