import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface PaymentReminderData extends EmailTemplateData {
  firstName: string;
  paymentAmount: number;
  paymentLink: string;
  expirationDate: Date;
  registrationDate: Date;
  reminderType: 'first' | 'second' | 'final';
  daysOverdue: number;
  companyName: string;
  supportEmail: string;
}

export class PaymentReminderEmail extends BaseEmailTemplate<PaymentReminderData> {
  getSubject(): string {
    const { reminderType, companyName } = this.data;
    
    switch (reminderType) {
      case 'final':
        return `🚨 Final Notice: Complete Your ${companyName} Registration`;
      case 'second':
        return `⏰ Reminder: Complete Your ${companyName} Registration`;
      default:
        return `💳 Payment Reminder: Activate Your ${companyName} Account`;
    }
  }

  getHtml(): string {
    const {
      firstName, paymentAmount, paymentLink, expirationDate, registrationDate,
      reminderType, daysOverdue, companyName, supportEmail
    } = this.data;

    const urgencyColor = reminderType === 'final' ? '#dc2626' : reminderType === 'second' ? '#f59e0b' : '#3b82f6';
    const urgencyIcon = reminderType === 'final' ? '🚨' : reminderType === 'second' ? '⏰' : '💳';
    
    const content = `
      ${this.getHeader('Payment Reminder')}
      <div class="email-body">
        <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); color: white; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: white;">${urgencyIcon} Payment Reminder</div>
          <p style="margin: 0; color: white;">Complete your ${companyName} registration</p>
        </div>

        <p>Hello ${firstName},</p>
        
        ${reminderType === 'final' ? `
          <p><strong>This is your final reminder.</strong> Your ${companyName} registration is still incomplete and will expire soon.</p>
        ` : reminderType === 'second' ? `
          <p>We noticed you haven't completed your ${companyName} registration payment yet. Don't miss out on our services!</p>
        ` : `
          <p>Thank you for signing up with ${companyName}! To activate your account and start using our cylinder services, please complete your registration payment.</p>
        `}

        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0 0 16px 0; color: #374151;">Registration Fee</h3>
          <div style="font-size: 36px; font-weight: bold; color: ${urgencyColor}; margin: 16px 0;">$${paymentAmount.toFixed(2)}</div>
          <p style="margin: 0; color: #6b7280;">One-time activation fee</p>
        </div>

        ${daysOverdue > 0 ? `
          <div style="background-color: ${reminderType === 'final' ? '#fef2f2' : reminderType === 'second' ? '#fffbeb' : '#eff6ff'}; border: 2px solid ${reminderType === 'final' ? '#fecaca' : reminderType === 'second' ? '#fde68a' : '#dbeafe'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="color: ${urgencyColor}; font-weight: bold; font-size: 18px; margin-bottom: 12px;">⚠️ Payment Overdue</div>
            <p>Your payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Please complete your payment to avoid account closure.</p>
          </div>
        ` : ''}

        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <h4 style="margin: 0 0 8px 0; color: #dc2626;">Payment Link Expires</h4>
          <div style="font-size: 20px; font-weight: bold; color: #dc2626; margin: 8px 0;">${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()}</div>
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
            After expiration, you'll need to contact support for a new payment link
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentLink}" class="button" style="background-color: ${urgencyColor};">
            💳 Complete Payment Now
          </a>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #374151;">📋 Registration Details</h4>
          <div style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span><strong>Registration Date:</strong></span>
            <span>${registrationDate.toLocaleDateString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span><strong>Amount Due:</strong></span>
            <span style="color: ${urgencyColor}; font-weight: bold;">$${paymentAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 8px 0;">
            <span><strong>Payment Method:</strong></span>
            <span>Secure Online Payment</span>
          </div>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 16px 0; color: #065f46;">🎯 What You Get After Payment</h4>
          <ul>
            <li>Immediate access to cylinder leasing services</li>
            <li>Priority booking at all ${companyName} outlets</li>
            <li>Digital receipt and tracking for all transactions</li>
            <li>24/7 customer support</li>
            <li>Special member pricing and discounts</li>
            <li>Mobile app access for easy management</li>
          </ul>
        </div>

        ${reminderType === 'final' ? `
          <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin: 0 0 12px 0; color: #dc2626;">⚠️ Account Closure Warning</h4>
            <p style="margin: 0; color: #7f1d1d;">
              If payment is not received by ${expirationDate.toLocaleDateString()}, your account will be automatically closed. 
              You would need to re-register to use our services.
            </p>
          </div>
        ` : ''}

        <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
          <h4 style="margin: 0 0 12px 0; color: #1d4ed8;">💬 Need Help?</h4>
          <p style="margin: 0;">
            Having trouble with payment? Contact our support team at 
            <a href="mailto:${supportEmail}">${supportEmail}</a> for assistance.
          </p>
        </div>

        <p>Complete your payment today and start enjoying ${companyName} services!</p>
      </div>
      ${this.getFooter(companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    const {
      firstName, paymentAmount, paymentLink, expirationDate, registrationDate,
      reminderType, daysOverdue, companyName, supportEmail
    } = this.data;

    const urgencyText = reminderType === 'final' 
      ? 'FINAL REMINDER - ACTION REQUIRED'
      : reminderType === 'second'
      ? 'SECOND REMINDER'
      : 'PAYMENT REMINDER';

    return `
${urgencyText}
Complete Your ${companyName} Registration

Hello ${firstName},

${reminderType === 'final' 
  ? `This is your FINAL reminder. Your registration will expire soon and your account will be closed.`
  : reminderType === 'second'
  ? `We noticed you haven't completed your registration payment yet.`
  : `Thank you for signing up! Please complete your registration payment to activate your account.`
}

PAYMENT DETAILS:
- Registration Fee: $${paymentAmount.toFixed(2)}
- Registration Date: ${registrationDate.toLocaleDateString()}
- Payment Link Expires: ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()}

${daysOverdue > 0 ? `⚠️ OVERDUE: Your payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue!\n` : ''}

COMPLETE PAYMENT: ${paymentLink}

WHAT YOU GET AFTER PAYMENT:
- Immediate access to cylinder leasing services
- Priority booking at all outlets
- Digital receipts and tracking
- 24/7 customer support
- Member pricing and discounts
- Mobile app access

${reminderType === 'final' ? `
⚠️ WARNING: Account will be closed if payment not received by ${expirationDate.toLocaleDateString()}
` : ''}

Need help? Contact us at ${supportEmail}

Complete your payment today and start using ${companyName} services!
    `.trim();
  }
}