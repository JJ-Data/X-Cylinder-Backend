import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface LoginNotificationData extends EmailTemplateData {
  firstName: string;
  loginTime: Date;
  deviceInfo: string;
  browserInfo: string;
  ipAddress: string;
  location?: string;
  loginType: 'normal' | 'suspicious' | 'new_device';
  companyName: string;
  supportEmail: string;
}

export class LoginNotificationEmail extends BaseEmailTemplate<LoginNotificationData> {
  getSubject(): string {
    switch (this.data.loginType) {
      case 'suspicious':
        return '🚨 Suspicious Login Detected';
      case 'new_device':
        return '🔒 New Device Login to Your Account';
      default:
        return '🔑 Login Notification';
    }
  }

  getHtml(): string {
    const {
      firstName, loginTime, deviceInfo, browserInfo, ipAddress, location,
      loginType, companyName, supportEmail
    } = this.data;

    const loginTypeIcon = loginType === 'suspicious' ? '🚨' : loginType === 'new_device' ? '🔒' : '✅';
    const loginTypeColor = loginType === 'suspicious' ? '#dc2626' : loginType === 'new_device' ? '#f59e0b' : '#10b981';

    const content = `
      ${this.getHeader('Security Alert')}
      <div class="email-body">
        <div style="background: linear-gradient(135deg, ${loginTypeColor} 0%, ${loginTypeColor}dd 100%); color: white; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
          <h2 style="margin: 0; color: white;">${loginTypeIcon} Security Alert</h2>
          <p style="margin: 8px 0 0 0; color: white;">New login to your ${companyName} account</p>
        </div>

        <p>Hello ${firstName},</p>
        
        ${loginType === 'suspicious' ? `
          <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="color: ${loginTypeColor}; font-weight: bold; font-size: 18px; margin-bottom: 12px;">⚠️ Suspicious Login Detected</div>
            <p>We detected a login from a new location or device. If this wasn't you, please secure your account immediately.</p>
          </div>
        ` : loginType === 'new_device' ? `
          <div style="background-color: #fffbeb; border: 2px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="color: ${loginTypeColor}; font-weight: bold; font-size: 18px; margin-bottom: 12px;">🔒 New Device Login</div>
            <p>We noticed you logged in from a new device. This is likely you, but we wanted to let you know for your security.</p>
          </div>
        ` : `
          <p>Your account was successfully accessed. This is a routine security notification.</p>
        `}

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Login Details:</h3>
          <p><strong>Time:</strong> ${loginTime.toLocaleString()}</p>
          <p><strong>IP Address:</strong> ${ipAddress}</p>
          <p><strong>Device:</strong> ${deviceInfo}</p>
          <p><strong>Browser:</strong> ${browserInfo}</p>
          ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
        </div>

        ${loginType === 'suspicious' ? `
          <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #dc2626; margin-top: 0;">🛡️ Secure Your Account</h4>
            <p>If this login wasn't you:</p>
            <ul>
              <li>Change your password immediately</li>
              <li>Review your account activity</li>
              <li>Enable two-factor authentication</li>
              <li>Contact support if needed</li>
            </ul>
          </div>
        ` : ''}

        <p>If you have any concerns about this login, please contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>

        <p>Best regards,<br>The ${companyName} Security Team</p>
      </div>
      ${this.getFooter(companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    const {
      firstName, loginTime, deviceInfo, browserInfo, ipAddress, location,
      loginType, companyName, supportEmail
    } = this.data;

    const alertText = loginType === 'suspicious' 
      ? 'SUSPICIOUS LOGIN DETECTED - Please review immediately'
      : loginType === 'new_device'
      ? 'NEW DEVICE LOGIN - For your security awareness'
      : 'LOGIN NOTIFICATION';

    return `
${alertText}

Hello ${firstName},

${loginType === 'suspicious' 
  ? 'We detected a login from a new location or device. If this wasn\'t you, please secure your account immediately.'
  : loginType === 'new_device'
  ? 'We noticed you logged in from a new device. This is likely you, but we wanted to let you know for your security.'
  : 'Your account was successfully accessed. This is a routine security notification.'
}

LOGIN DETAILS:
- Time: ${loginTime.toLocaleString()}
- IP Address: ${ipAddress}
- Device: ${deviceInfo}
- Browser: ${browserInfo}
${location ? `- Location: ${location}` : ''}

${loginType === 'suspicious' ? `
SECURE YOUR ACCOUNT:
If this login wasn't you:
- Change your password immediately
- Review your account activity
- Enable two-factor authentication
- Contact support if needed
` : ''}

If you have any concerns about this login, please contact our support team at ${supportEmail}.

Best regards,
The ${companyName} Security Team
    `.trim();
  }
}