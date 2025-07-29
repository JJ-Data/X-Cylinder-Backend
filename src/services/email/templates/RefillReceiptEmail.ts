import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface RefillReceiptData extends EmailTemplateData {
  customerName: string;
  refillId: string;
  cylinderCode: string;
  cylinderType: string;
  preRefillVolume: number;
  postRefillVolume: number;
  refillAmount: number;
  refillCost: number;
  refillDate: Date;
  outletName: string;
  outletLocation: string;
  operatorName: string;
  batchNumber?: string;
  notes?: string;
  companyName: string;
  supportEmail: string;
}

export class RefillReceiptEmail extends BaseEmailTemplate<RefillReceiptData> {
  getSubject(): string {
    return `⛽ Refill Receipt - ${this.data.refillId}`;
  }

  getHtml(): string {
    const {
      customerName, refillId, cylinderCode, cylinderType, preRefillVolume,
      postRefillVolume, refillAmount, refillCost, refillDate, outletName,
      outletLocation, operatorName, batchNumber, notes, companyName, supportEmail
    } = this.data;

    const content = `
      ${this.getHeader('Cylinder Refill Receipt')}
      <div class="email-body">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: white;">Receipt #${refillId}</div>
          <p style="margin: 0; color: white;">Cylinder Refill Completed</p>
        </div>

        <p>Dear ${customerName},</p>
        
        <p>Your cylinder has been successfully refilled! Here's your receipt:</p>

        <div style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 16px 0; color: #059669; text-align: center;">⛽ Refill Summary</h3>
          
          <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0; padding: 20px; background-color: #ffffff; border-radius: 8px; border: 1px solid #d1d5db;">
            <div style="text-align: center; padding: 16px; border-radius: 8px; min-width: 120px; background-color: #fef2f2; border: 1px solid #fecaca;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Before</div>
              <div style="font-size: 20px; font-weight: bold; color: #111827;">${preRefillVolume.toFixed(1)}L</div>
            </div>
            <div style="font-size: 24px; color: #10b981;">→</div>
            <div style="text-align: center; padding: 16px; border-radius: 8px; min-width: 120px; background-color: #f0fdf4; border: 1px solid #bbf7d0;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">After</div>
              <div style="font-size: 20px; font-weight: bold; color: #111827;">${postRefillVolume.toFixed(1)}L</div>
            </div>
          </div>

          <div style="text-align: center; margin: 16px 0;">
            <div style="font-size: 18px; color: #059669; font-weight: bold;">
              Gas Added: ${refillAmount.toFixed(1)}L
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cylinder Code</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderCode}</div>
          </div>
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cylinder Type</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderType}</div>
          </div>
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Refill Date</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${refillDate.toLocaleDateString()}</div>
          </div>
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Refill Time</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${refillDate.toLocaleTimeString()}</div>
          </div>
        </div>

        ${batchNumber ? `
          <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Batch Number</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600;">${batchNumber}</div>
          </div>
        ` : ''}

        <div style="background-color: #fef7ed; border: 2px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <h4 style="margin: 0; color: #ea580c;">Total Amount</h4>
          <div style="font-size: 32px; font-weight: bold; color: #ea580c; margin: 8px 0;">$${refillCost.toFixed(2)}</div>
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
            Rate: $${(refillCost / refillAmount).toFixed(2)} per liter
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #374151;">📍 Service Location</h4>
          <p><strong>${outletName}</strong><br>
          ${outletLocation}<br>
          <em>Serviced by: ${operatorName}</em></p>
        </div>

        ${notes ? `
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">📝 Service Notes</h4>
            <p style="margin: 0; color: #78350f;">${notes}</p>
          </div>
        ` : ''}

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
      customerName, refillId, cylinderCode, cylinderType, preRefillVolume,
      postRefillVolume, refillAmount, refillCost, refillDate, outletName,
      outletLocation, operatorName, batchNumber, notes, companyName, supportEmail
    } = this.data;

    return `
CYLINDER REFILL RECEIPT
Receipt #${refillId}

Dear ${customerName},

Your cylinder has been successfully refilled!

REFILL SUMMARY:
- Cylinder Code: ${cylinderCode}
- Cylinder Type: ${cylinderType}
- Before Refill: ${preRefillVolume.toFixed(1)}L
- After Refill: ${postRefillVolume.toFixed(1)}L
- Gas Added: ${refillAmount.toFixed(1)}L

TRANSACTION DETAILS:
- Refill Date: ${refillDate.toLocaleDateString()}
- Refill Time: ${refillDate.toLocaleTimeString()}
${batchNumber ? `- Batch Number: ${batchNumber}` : ''}
- Total Cost: $${refillCost.toFixed(2)}
- Rate: $${(refillCost / refillAmount).toFixed(2)} per liter

SERVICE LOCATION:
${outletName}
${outletLocation}
Serviced by: ${operatorName}

${notes ? `SERVICE NOTES:\n${notes}\n` : ''}

Keep this receipt for your records.
Questions? Contact us at ${supportEmail}

Thank you for using ${companyName}!
    `.trim();
  }
}