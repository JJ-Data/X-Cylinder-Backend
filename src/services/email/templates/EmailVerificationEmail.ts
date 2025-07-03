import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface EmailVerificationEmailData extends EmailTemplateData {
  firstName: string;
  verificationUrl: string;
  expirationTime: string; // e.g., "24 hours"
  companyName?: string;
}

export class EmailVerificationEmail extends BaseEmailTemplate<EmailVerificationEmailData> {
  getSubject(): string {
    return 'Verify Your Email Address';
  }

  getHtml(): string {
    const content = `
      ${this.getHeader('Verify Your Email')}
      <div class="email-body">
        <p>Hi ${this.data.firstName},</p>
        <p>
          Thank you for signing up! To complete your registration and ensure the security 
          of your account, please verify your email address.
        </p>
        <p>
          Click the button below to verify your email:
        </p>
        <div style="text-align: center;">
          <a href="${this.data.verificationUrl}" class="button">Verify Email Address</a>
        </div>
        <p class="text-muted" style="margin-top: 20px;">
          Or copy and paste this link into your browser:
        </p>
        <p class="text-muted" style="word-break: break-all;">
          ${this.data.verificationUrl}
        </p>
        <div class="divider"></div>
        <p>
          <strong>Note:</strong> This verification link will expire in 
          <strong>${this.data.expirationTime}</strong>. If the link expires, 
          you can request a new verification email from your account settings.
        </p>
        <h3>Why verify your email?</h3>
        <ul>
          <li>Ensures you can recover your account if needed</li>
          <li>Helps protect your account from unauthorized access</li>
          <li>Enables important notifications and updates</li>
        </ul>
        <p>
          If you didn't create an account with us, please ignore this email.
        </p>
        <p>
          Best regards,<br>
          The ${this.data.companyName || 'Team'}
        </p>
      </div>
      ${this.getFooter(this.data.companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    return `
Verify Your Email Address

Hi ${this.data.firstName},

Thank you for signing up! To complete your registration and ensure the security of your account, please verify your email address.

Click the link below to verify your email:
${this.data.verificationUrl}

Note: This verification link will expire in ${this.data.expirationTime}. If the link expires, you can request a new verification email from your account settings.

Why verify your email?
- Ensures you can recover your account if needed
- Helps protect your account from unauthorized access
- Enables important notifications and updates

If you didn't create an account with us, please ignore this email.

Best regards,
The ${this.data.companyName || 'Team'}
    `.trim();
  }
}