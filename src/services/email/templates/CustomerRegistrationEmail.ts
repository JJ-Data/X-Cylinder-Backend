import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface CustomerRegistrationEmailData extends EmailTemplateData {
  firstName: string;
  email: string;
  paymentLink: string;
  amount: number;
  expiresAt: Date;
  companyName?: string;
}

export class CustomerRegistrationEmail extends BaseEmailTemplate<CustomerRegistrationEmailData> {
  getSubject(): string {
    return `Complete Your ${this.data.companyName || 'CylinderX'} Registration`;
  }

  getHtml(): string {
    const content = `
      ${this.getHeader(`Welcome to ${this.data.companyName || 'CylinderX'}!`)}
      <div class="email-body">
        <h2>Thank you for registering, ${this.data.firstName}!</h2>
        <p>Hi ${this.data.firstName},</p>
        <p>
          Your customer account has been created successfully with the email address: 
          <strong>${this.data.email}</strong>
        </p>
        <p>
          To complete your registration and activate your account, please process the activation fee 
          using the button below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.data.paymentLink}" class="button" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Complete Registration - $${this.data.amount}
          </a>
        </div>
        <div class="info-box" style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #495057;">Payment Details:</h4>
          <p style="margin: 5px 0;"><strong>Amount:</strong> $${this.data.amount}</p>
          <p style="margin: 5px 0;"><strong>Expires:</strong> ${this.data.expiresAt.toLocaleDateString()} at ${this.data.expiresAt.toLocaleTimeString()}</p>
        </div>
        <div class="divider"></div>
        <h3>What happens next?</h3>
        <ul>
          <li>Complete your payment using the link above</li>
          <li>Your account will be activated immediately</li>
          <li>You'll receive a welcome email with next steps</li>
          <li>Start using our cylinder lease services</li>
        </ul>
        <p>
          <strong>Need help?</strong> If you have any questions about the registration process or 
          our services, please don't hesitate to contact our support team.
        </p>
        <p>
          Best regards,<br>
          The ${this.data.companyName || 'CylinderX'} Team
        </p>
      </div>
      ${this.getFooter(this.data.companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    return `
Welcome to ${this.data.companyName || 'CylinderX'}!

Hi ${this.data.firstName},

Thank you for registering! Your customer account has been created successfully with the email address: ${this.data.email}

To complete your registration and activate your account, please process the activation fee:

Payment Link: ${this.data.paymentLink}
Amount: $${this.data.amount}
Expires: ${this.data.expiresAt.toLocaleDateString()} at ${this.data.expiresAt.toLocaleTimeString()}

What happens next?
- Complete your payment using the link above
- Your account will be activated immediately
- You'll receive a welcome email with next steps
- Start using our cylinder lease services

Need help? If you have any questions about the registration process or our services, please don't hesitate to contact our support team.

Best regards,
The ${this.data.companyName || 'CylinderX'} Team
    `.trim();
  }
}