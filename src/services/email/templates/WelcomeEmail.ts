import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface WelcomeEmailData extends EmailTemplateData {
  firstName: string;
  email: string;
  loginUrl: string;
  companyName?: string;
}

export class WelcomeEmail extends BaseEmailTemplate<WelcomeEmailData> {
  getSubject(): string {
    return `Welcome to ${this.data.companyName || 'Our Platform'}!`;
  }

  getHtml(): string {
    const content = `
      ${this.getHeader(`Welcome, ${this.data.firstName}!`)}
      <div class="email-body">
        <h2>Thank you for joining us!</h2>
        <p>Hi ${this.data.firstName},</p>
        <p>
          We're excited to have you on board! Your account has been successfully created 
          with the email address: <strong>${this.data.email}</strong>
        </p>
        <p>
          To get started, you can log in to your account using the button below:
        </p>
        <div style="text-align: center;">
          <a href="${this.data.loginUrl}" class="button">Log In to Your Account</a>
        </div>
        <div class="divider"></div>
        <h3>What's Next?</h3>
        <ul>
          <li>Complete your profile to personalize your experience</li>
          <li>Explore our features and tools</li>
          <li>Check out our documentation and guides</li>
        </ul>
        <p>
          If you have any questions or need assistance, our support team is here to help!
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
Welcome to ${this.data.companyName || 'Our Platform'}!

Hi ${this.data.firstName},

Thank you for joining us! Your account has been successfully created with the email address: ${this.data.email}

To get started, you can log in to your account at: ${this.data.loginUrl}

What's Next?
- Complete your profile to personalize your experience
- Explore our features and tools
- Check out our documentation and guides

If you have any questions or need assistance, our support team is here to help!

Best regards,
The ${this.data.companyName || 'Team'}
    `.trim();
  }
}