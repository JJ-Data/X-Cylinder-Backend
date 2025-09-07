import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface LeaseConfirmationData extends EmailTemplateData {
  customerName: string;
  leaseId: string;
  cylinderCode: string;
  cylinderType: string;
  cylinderSize: string;
  leaseStartDate: Date;
  expectedReturnDate?: Date;  // Optional - may not have expected return date
  leaseCost: number;
  depositAmount: number;
  outletName: string;
  outletLocation: string;
  staffName: string;
  returnInstructions: string;
  companyName: string;
  supportEmail: string;
}

export class LeaseConfirmationEmail extends BaseEmailTemplate<LeaseConfirmationData> {
  getSubject(): string {
    return `🛡️ Lease Confirmation - ${this.data.leaseId}`;
  }

  getHtml(): string {
    const {
      customerName, leaseId, cylinderCode, cylinderType, cylinderSize,
      leaseStartDate, expectedReturnDate, leaseCost, depositAmount,
      outletName, outletLocation, staffName, returnInstructions,
      companyName, supportEmail
    } = this.data;

    const content = `
      ${this.getHeader('Lease Confirmation')}
      <div class="email-body">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: white;">Lease #${leaseId}</div>
          <p style="margin: 0; color: white;">Cylinder Lease Confirmed</p>
        </div>

        <p>Dear ${customerName},</p>
        
        <p>Your cylinder lease has been successfully confirmed! Here are your lease details:</p>

        <div style="background-color: #eff6ff; border: 2px solid #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 16px 0; color: #1d4ed8; text-align: center;">🛡️ Lease Details</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cylinder Code</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderCode}</div>
            </div>
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cylinder Type</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderType}</div>
            </div>
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Size</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderSize}</div>
            </div>
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Lease Start</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${leaseStartDate.toLocaleDateString()}</div>
            </div>
          </div>

          ${expectedReturnDate ? `
          <div style="background-color: #fef7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <h4 style="margin: 0 0 8px 0; color: #ea580c;">📅 Expected Return Date</h4>
            <div style="font-size: 20px; font-weight: bold; color: #ea580c;">
              ${expectedReturnDate.toLocaleDateString()}
            </div>
          </div>
          ` : ''}
        </div>

        <div style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 16px 0; color: #059669; text-align: center;">💰 Cost Breakdown</h3>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 12px 0; border-bottom: 1px solid #d1d5db;">
            <span style="font-weight: 600;">Lease Fee:</span>
            <span style="font-size: 18px; font-weight: bold; color: #059669;">$${leaseCost.toFixed(2)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 12px 0; border-bottom: 1px solid #d1d5db;">
            <span style="font-weight: 600;">Security Deposit:</span>
            <span style="font-size: 18px; font-weight: bold; color: #059669;">$${depositAmount.toFixed(2)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0 0 0; padding: 16px 0; border-top: 2px solid #059669;">
            <span style="font-size: 18px; font-weight: bold;">Total Paid:</span>
            <span style="font-size: 24px; font-weight: bold; color: #059669;">$${(leaseCost + depositAmount).toFixed(2)}</span>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #374151;">📍 Pickup Location</h4>
          <p><strong>${outletName}</strong><br>
          ${outletLocation}<br>
          <em>Processed by: ${staffName}</em></p>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #92400e;">📋 Return Instructions</h4>
          <p style="margin: 0; color: #78350f;">${returnInstructions}</p>
        </div>

        <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #dc2626;">⚠️ Important Notes</h4>
          <ul style="margin: 0; color: #7f1d1d;">
            <li>Keep this cylinder code (${cylinderCode}) for all future transactions</li>
            ${expectedReturnDate ? `<li>Return by ${expectedReturnDate.toLocaleDateString()} to avoid late fees</li>` : ''}
            <li>Your security deposit will be refunded upon safe return</li>
            <li>Report any issues with the cylinder immediately</li>
            <li>Only use this cylinder for its intended purpose</li>
          </ul>
        </div>

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #0369a1;">💬 Need Help?</h4>
          <p style="margin: 0; color: #0c4a6e;">
            Questions about your lease? Contact us at 
            <a href="mailto:${supportEmail}">${supportEmail}</a> or visit any ${companyName} outlet.
          </p>
        </div>

        <p style="margin-top: 30px;">
          Keep this confirmation for your records. We appreciate your business with ${companyName}!
        </p>

        <p>Safe operations!</p>
      </div>
      ${this.getFooter(companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    const {
      customerName, leaseId, cylinderCode, cylinderType, cylinderSize,
      leaseStartDate, expectedReturnDate, leaseCost, depositAmount,
      outletName, outletLocation, staffName, returnInstructions,
      companyName, supportEmail
    } = this.data;

    return `
CYLINDER LEASE CONFIRMATION
Lease #${leaseId}

Dear ${customerName},

Your cylinder lease has been successfully confirmed!

LEASE DETAILS:
- Cylinder Code: ${cylinderCode}
- Cylinder Type: ${cylinderType}
- Size: ${cylinderSize}
- Lease Start: ${leaseStartDate.toLocaleDateString()}
${expectedReturnDate ? `- Expected Return: ${expectedReturnDate.toLocaleDateString()}` : '- Expected Return: Not specified'}

COST BREAKDOWN:
- Lease Fee: $${leaseCost.toFixed(2)}
- Security Deposit: $${depositAmount.toFixed(2)}
- Total Paid: $${(leaseCost + depositAmount).toFixed(2)}

PICKUP LOCATION:
${outletName}
${outletLocation}
Processed by: ${staffName}

RETURN INSTRUCTIONS:
${returnInstructions}

IMPORTANT NOTES:
- Keep cylinder code (${cylinderCode}) for all future transactions
${expectedReturnDate ? `- Return by ${expectedReturnDate.toLocaleDateString()} to avoid late fees` : ''}
- Security deposit refunded upon safe return
- Report any issues immediately
- Use only for intended purpose

Need help? Contact us at ${supportEmail}

Keep this confirmation for your records.
Safe operations!

${companyName}
    `.trim();
  }
}