import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface CustomerWelcomeEmailData extends EmailTemplateData {
  firstName: string;
  email: string;
  activationDate: Date;
  supportEmail: string;
  companyName?: string;
}

export class CustomerWelcomeEmail extends BaseEmailTemplate<CustomerWelcomeEmailData> {
  getSubject(): string {
    return `Welcome to ${this.data.companyName || 'CylinderX'} - Account Activated!`;
  }

  getHtml(): string {
    const content = `
      ${this.getHeader(`Welcome, ${this.data.firstName}!`)}
      <div class="email-body">
        <div style="text-align: center; margin: 30px 0;">
          <div style="width: 80px; height: 80px; background-color: #28a745; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px; color: white;">✓</span>
          </div>
          <h2 style="color: #28a745; margin: 0;">Account Successfully Activated!</h2>
        </div>
        
        <p>Congratulations, ${this.data.firstName}!</p>
        <p>
          Your ${this.data.companyName || 'CylinderX'} customer account has been successfully activated 
          on ${this.data.activationDate.toLocaleDateString()}. You can now start using our cylinder lease services!
        </p>

        <div class="info-box" style="background-color: #e8f5e8; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #155724;">Your Account Details:</h4>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${this.data.email}</p>
          <p style="margin: 5px 0;"><strong>Account Type:</strong> Customer</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Active</span></p>
          <p style="margin: 5px 0;"><strong>Activated:</strong> ${this.data.activationDate.toLocaleDateString()}</p>
        </div>

        <div class="divider"></div>
        
        <h3>What can you do now?</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
          <div style="padding: 15px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #007bff;">🏭 Lease Cylinders</h4>
            <p style="margin: 0; font-size: 14px;">Rent gas cylinders for your business or personal use</p>
          </div>
          <div style="padding: 15px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #007bff;">🔄 Cylinder Swaps</h4>
            <p style="margin: 0; font-size: 14px;">Exchange empty cylinders for filled ones quickly</p>
          </div>
          <div style="padding: 15px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #007bff;">⛽ Refill Services</h4>
            <p style="margin: 0; font-size: 14px;">Get your cylinders refilled at our outlets</p>
          </div>
          <div style="padding: 15px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #007bff;">📊 Track Usage</h4>
            <p style="margin: 0; font-size: 14px;">Monitor your cylinder usage and lease history</p>
          </div>
        </div>

        <div class="divider"></div>
        
        <h3>Need Assistance?</h3>
        <p>
          Our customer support team is here to help you get started. If you have any questions 
          about our services, pricing, or how to lease a cylinder, please reach out to us:
        </p>
        <p style="text-align: center;">
          <a href="mailto:${this.data.supportEmail}" style="color: #007bff; text-decoration: none; font-weight: bold;">${this.data.supportEmail}</a>
        </p>

        <p>
          Thank you for choosing ${this.data.companyName || 'CylinderX'} for your gas cylinder needs!
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
Welcome to ${this.data.companyName || 'CylinderX'} - Account Activated!

Congratulations, ${this.data.firstName}!

Your ${this.data.companyName || 'CylinderX'} customer account has been successfully activated on ${this.data.activationDate.toLocaleDateString()}. You can now start using our cylinder lease services!

Your Account Details:
- Email: ${this.data.email}
- Account Type: Customer
- Status: Active
- Activated: ${this.data.activationDate.toLocaleDateString()}

What can you do now?
🏭 Lease Cylinders - Rent gas cylinders for your business or personal use
🔄 Cylinder Swaps - Exchange empty cylinders for filled ones quickly
⛽ Refill Services - Get your cylinders refilled at our outlets
📊 Track Usage - Monitor your cylinder usage and lease history

Need Assistance?
Our customer support team is here to help you get started. If you have any questions about our services, pricing, or how to lease a cylinder, please reach out to us at: ${this.data.supportEmail}

Thank you for choosing ${this.data.companyName || 'CylinderX'} for your gas cylinder needs!

Best regards,
The ${this.data.companyName || 'CylinderX'} Team
    `.trim();
  }
}