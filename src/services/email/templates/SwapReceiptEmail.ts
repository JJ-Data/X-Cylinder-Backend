import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface SwapReceiptData extends EmailTemplateData {
  customerName: string;
  swapId: string;
  oldCylinderCode: string;
  newCylinderCode: string;
  cylinderType: string;
  oldCylinderCondition: string;
  newCylinderCondition: string;
  swapReason: string;
  swapFee: number;
  swapDate: Date;
  outletName: string;
  outletLocation: string;
  operatorName: string;
  notes?: string;
  companyName: string;
  supportEmail: string;
}

export class SwapReceiptEmail extends BaseEmailTemplate<SwapReceiptData> {
  getSubject(): string {
    return `🔄 Cylinder Swap Receipt - ${this.data.swapId}`;
  }

  private getConditionColor(condition: string): string {
    switch (condition.toLowerCase()) {
      case 'good': return '#10b981';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      case 'damaged': return '#dc2626';
      default: return '#6b7280';
    }
  }

  private getConditionIcon(condition: string): string {
    switch (condition.toLowerCase()) {
      case 'good': return '✅';
      case 'fair': return '⚠️';
      case 'poor': return '🔴';
      case 'damaged': return '❌';
      default: return '❓';
    }
  }

  getHtml(): string {
    const {
      customerName, swapId, oldCylinderCode, newCylinderCode, cylinderType,
      oldCylinderCondition, newCylinderCondition, swapReason, swapFee,
      swapDate, outletName, outletLocation, operatorName, notes,
      companyName, supportEmail
    } = this.data;

    const content = `
      ${this.getHeader('Cylinder Swap Receipt')}
      <div class="email-body">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: white;">Swap #${swapId}</div>
          <p style="margin: 0; color: white;">Cylinder Exchange Completed</p>
        </div>

        <p>Dear ${customerName},</p>
        
        <p>Your cylinder swap has been successfully completed. Here are the details:</p>

        <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 30px 0; padding: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px;">
          <div style="background-color: white; border-radius: 10px; padding: 20px; min-width: 150px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="color: #dc2626; font-weight: bold; margin-bottom: 8px;">OLD CYLINDER</div>
            <div style="font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 8px;">${oldCylinderCode}</div>
            <div style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background-color: ${this.getConditionColor(oldCylinderCondition)}20; color: ${this.getConditionColor(oldCylinderCondition)};">
              ${this.getConditionIcon(oldCylinderCondition)} ${oldCylinderCondition}
            </div>
          </div>
          
          <div style="font-size: 32px; color: #d97706; font-weight: bold;">🔄</div>
          
          <div style="background-color: white; border-radius: 10px; padding: 20px; min-width: 150px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="color: #059669; font-weight: bold; margin-bottom: 8px;">NEW CYLINDER</div>
            <div style="font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 8px;">${newCylinderCode}</div>
            <div style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background-color: ${this.getConditionColor(newCylinderCondition)}20; color: ${this.getConditionColor(newCylinderCondition)};">
              ${this.getConditionIcon(newCylinderCondition)} ${newCylinderCondition}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cylinder Type</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderType}</div>
          </div>
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Swap Date</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${swapDate.toLocaleDateString()}</div>
          </div>
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Swap Time</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${swapDate.toLocaleTimeString()}</div>
          </div>
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Processed By</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${operatorName}</div>
          </div>
        </div>

        <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #1d4ed8;">📋 Swap Reason</h4>
          <p style="margin: 0; color: #374151;">${swapReason}</p>
        </div>

        <div style="background-color: ${swapFee > 0 ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${swapFee > 0 ? '#fecaca' : '#bbf7d0'}; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <h4 style="margin: 0; color: ${swapFee > 0 ? '#dc2626' : '#059669'};">
            ${swapFee > 0 ? '💰 Swap Fee' : '🎉 No Fee Required'}
          </h4>
          <div style="font-size: 28px; font-weight: bold; color: ${swapFee > 0 ? '#dc2626' : '#059669'}; margin: 8px 0;">
            ${swapFee > 0 ? `$${swapFee.toFixed(2)}` : 'FREE'}
          </div>
          ${swapFee > 0 ? `
            <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
              Fee applied due to ${oldCylinderCondition.toLowerCase()} condition
            </p>
          ` : `
            <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
              Standard exchange - no additional charges
            </p>
          `}
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #374151;">📍 Service Location</h4>
          <p><strong>${outletName}</strong><br>
          ${outletLocation}<br>
          <em>Processed by: ${operatorName}</em></p>
        </div>

        ${notes ? `
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">📝 Service Notes</h4>
            <p style="margin: 0; color: #78350f;">${notes}</p>
          </div>
        ` : ''}

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #0369a1;">💡 Important Reminder</h4>
          <p style="margin: 0; color: #0c4a6e;">
            Your new cylinder (${newCylinderCode}) is now active in our system. 
            Please use this code for any future services or returns.
          </p>
        </div>

        <p style="margin-top: 30px;">
          Keep this receipt for your records. For questions or concerns, contact us at 
          <a href="mailto:${supportEmail}">${supportEmail}</a>
        </p>

        <p>Thank you for using ${companyName}!</p>
      </div>
      ${this.getFooter(companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    const {
      customerName, swapId, oldCylinderCode, newCylinderCode, cylinderType,
      oldCylinderCondition, newCylinderCondition, swapReason, swapFee,
      swapDate, outletName, outletLocation, operatorName, notes,
      companyName, supportEmail
    } = this.data;

    return `
CYLINDER SWAP RECEIPT
Swap #${swapId}

Dear ${customerName},

Your cylinder swap has been completed successfully!

SWAP DETAILS:
- Old Cylinder: ${oldCylinderCode} (${oldCylinderCondition} condition)
- New Cylinder: ${newCylinderCode} (${newCylinderCondition} condition)
- Cylinder Type: ${cylinderType}
- Swap Reason: ${swapReason}

TRANSACTION DETAILS:
- Swap Date: ${swapDate.toLocaleDateString()}
- Swap Time: ${swapDate.toLocaleTimeString()}
- Swap Fee: ${swapFee > 0 ? `$${swapFee.toFixed(2)}` : 'FREE'}
- Processed By: ${operatorName}

SERVICE LOCATION:
${outletName}
${outletLocation}

${notes ? `SERVICE NOTES:\n${notes}\n` : ''}

IMPORTANT: Your new cylinder code is ${newCylinderCode}. 
Please use this code for any future services.

Keep this receipt for your records.
Questions? Contact us at ${supportEmail}

Thank you for using ${companyName}!
    `.trim();
  }
}