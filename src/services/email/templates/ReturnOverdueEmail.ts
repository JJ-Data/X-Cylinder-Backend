import { BaseEmailTemplate, EmailTemplateData } from './BaseTemplate';

export interface ReturnOverdueData extends EmailTemplateData {
  customerName: string;
  leaseId: string;
  cylinderCode: string;
  cylinderType: string;
  originalReturnDate: Date;
  daysOverdue: number;
  lateFeePerDay: number;
  totalLateFees: number;
  noticeType: 'first' | 'final';
  outletName: string;
  outletLocation: string;
  outletPhone?: string;
  companyName: string;
  supportEmail: string;
}

export class ReturnOverdueEmail extends BaseEmailTemplate<ReturnOverdueData> {
  getSubject(): string {
    const { noticeType, cylinderCode, daysOverdue } = this.data;
    
    if (noticeType === 'final') {
      return `🚨 FINAL NOTICE: Cylinder ${cylinderCode} Return Overdue (${daysOverdue} days)`;
    }
    return `⚠️ OVERDUE: Cylinder ${cylinderCode} Return Required (${daysOverdue} days late)`;
  }

  getHtml(): string {
    const {
      customerName, leaseId, cylinderCode, cylinderType, originalReturnDate,
      daysOverdue, lateFeePerDay, totalLateFees, noticeType, outletName,
      outletLocation, outletPhone, companyName, supportEmail
    } = this.data;

    const urgencyColor = noticeType === 'final' ? '#dc2626' : '#f59e0b';
    const urgencyIcon = noticeType === 'final' ? '🚨' : '⚠️';
    const urgencyBg = noticeType === 'final' ? '#fef2f2' : '#fffbeb';
    const urgencyBorder = noticeType === 'final' ? '#fecaca' : '#fde68a';

    const content = `
      ${this.getHeader(noticeType === 'final' ? 'FINAL NOTICE' : 'OVERDUE NOTICE')}
      <div class="email-body">
        <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); color: white; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; margin-bottom: 8px; color: white;">${urgencyIcon} ${noticeType === 'final' ? 'FINAL NOTICE' : 'OVERDUE NOTICE'}</div>
          <p style="margin: 0; color: white; font-size: 18px;">Cylinder Return Required Immediately</p>
        </div>

        <p>Dear ${customerName},</p>
        
        ${noticeType === 'final' ? `
          <div style="background-color: ${urgencyBg}; border: 2px solid ${urgencyBorder}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: ${urgencyColor};">⚠️ FINAL NOTICE - IMMEDIATE ACTION REQUIRED</h3>
            <p style="margin: 0; color: #7f1d1d; font-weight: 600;">
              This is your final notice. If the cylinder is not returned within the next 48 hours, 
              additional penalties may apply and legal action may be initiated to recover the cylinder.
            </p>
          </div>
        ` : `
          <p>Our records show that you have not returned a leased cylinder by the agreed return date. 
          Please arrange for its immediate return to avoid additional charges.</p>
        `}

        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 16px 0; color: #374151; text-align: center;">📋 Overdue Cylinder Details</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid ${urgencyColor};">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Lease ID</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${leaseId}</div>
            </div>
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid ${urgencyColor};">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cylinder Code</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderCode}</div>
            </div>
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid ${urgencyColor};">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cylinder Type</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${cylinderType}</div>
            </div>
            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid ${urgencyColor};">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Original Return Date</div>
              <div style="font-size: 16px; color: #111827; font-weight: 600;">${originalReturnDate.toLocaleDateString()}</div>
            </div>
          </div>

          <div style="background-color: ${urgencyBg}; border: 2px solid ${urgencyBorder}; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h4 style="margin: 0 0 8px 0; color: ${urgencyColor};">Days Overdue</h4>
            <div style="font-size: 36px; font-weight: bold; color: ${urgencyColor}; margin: 12px 0;">
              ${daysOverdue} ${daysOverdue === 1 ? 'DAY' : 'DAYS'}
            </div>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Since ${originalReturnDate.toLocaleDateString()}
            </p>
          </div>
        </div>

        ${totalLateFees > 0 ? `
          <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 16px 0; color: #dc2626; text-align: center;">💰 Late Fee Calculation</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 12px 0; border-bottom: 1px solid #f87171;">
              <span style="font-weight: 600;">Late Fee per Day:</span>
              <span style="font-size: 18px; font-weight: bold; color: #dc2626;">$${lateFeePerDay.toFixed(2)}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 12px 0; border-bottom: 1px solid #f87171;">
              <span style="font-weight: 600;">Days Overdue:</span>
              <span style="font-size: 18px; font-weight: bold; color: #dc2626;">${daysOverdue}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0 0 0; padding: 16px 0; border-top: 2px solid #dc2626;">
              <span style="font-size: 18px; font-weight: bold;">Total Late Fees:</span>
              <span style="font-size: 28px; font-weight: bold; color: #dc2626;">$${totalLateFees.toFixed(2)}</span>
            </div>

            <p style="margin: 16px 0 0 0; color: #7f1d1d; font-size: 14px; text-align: center;">
              Late fees will continue to accrue daily until the cylinder is returned
            </p>
          </div>
        ` : ''}

        <div style="background-color: #f0f9ff; border: 2px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 16px 0; color: #0369a1; text-align: center;">📍 Return Location</h3>
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">${outletName}</p>
            <p style="margin: 8px 0; color: #374151;">${outletLocation}</p>
            ${outletPhone ? `<p style="margin: 8px 0; color: #374151;">📞 <strong>${outletPhone}</strong></p>` : ''}
          </div>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 16px 0; color: #059669;">✅ How to Return Your Cylinder</h4>
          <ol style="margin: 0; color: #065f46; padding-left: 20px;">
            <li style="margin: 8px 0;">Bring the cylinder to the return location above</li>
            <li style="margin: 8px 0;">Have your lease ID (${leaseId}) ready</li>
            <li style="margin: 8px 0;">Our staff will inspect the cylinder condition</li>
            <li style="margin: 8px 0;">Complete the return paperwork</li>
            <li style="margin: 8px 0;">Receive confirmation of return completion</li>
          </ol>
        </div>

        ${noticeType === 'final' ? `
          <div style="background-color: #7f1d1d; color: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0 0 12px 0; color: white;">⚠️ CONSEQUENCES OF NON-RETURN</h3>
            <ul style="margin: 0; color: white; text-align: left; padding-left: 20px;">
              <li>Additional penalties and collection fees</li>
              <li>Reporting to credit agencies</li>
              <li>Legal action to recover cylinder and costs</li>
              <li>Suspension of future leasing privileges</li>
            </ul>
          </div>
        ` : ''}

        <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px; text-align: center;">
          <h4 style="margin: 0 0 12px 0; color: #1d4ed8;">📞 Immediate Assistance Required?</h4>
          <p style="margin: 0;">
            If you need help with the return process or have questions about your lease, 
            contact us immediately at <a href="mailto:${supportEmail}" style="color: #1d4ed8; font-weight: bold;">${supportEmail}</a>
          </p>
          ${outletPhone ? `
            <p style="margin: 8px 0 0 0;">
              Or call <strong style="color: #1d4ed8;">${outletPhone}</strong> for immediate assistance
            </p>
          ` : ''}
        </div>

        <p style="font-weight: bold; color: ${urgencyColor};">
          Please arrange for the immediate return of cylinder ${cylinderCode} to avoid additional charges and complications.
        </p>

        <p>Thank you for your prompt attention to this matter.</p>

        <p>Best regards,<br>
        The ${companyName} Team</p>
      </div>
      ${this.getFooter(companyName)}
    `;

    return this.getBaseHtml(content);
  }

  getText(): string {
    const {
      customerName, leaseId, cylinderCode, cylinderType, originalReturnDate,
      daysOverdue, lateFeePerDay, totalLateFees, noticeType, outletName,
      outletLocation, outletPhone, companyName, supportEmail
    } = this.data;

    const urgencyText = noticeType === 'final' 
      ? 'FINAL NOTICE - IMMEDIATE ACTION REQUIRED'
      : 'OVERDUE NOTICE - RETURN REQUIRED';

    return `
${urgencyText}
Cylinder Return Overdue

Dear ${customerName},

${noticeType === 'final' 
  ? 'This is your FINAL NOTICE. If the cylinder is not returned within 48 hours, additional penalties may apply and legal action may be initiated.'
  : 'Our records show that you have not returned a leased cylinder by the agreed return date. Please arrange for its immediate return to avoid additional charges.'
}

OVERDUE CYLINDER DETAILS:
- Lease ID: ${leaseId}
- Cylinder Code: ${cylinderCode}
- Cylinder Type: ${cylinderType}
- Original Return Date: ${originalReturnDate.toLocaleDateString()}
- Days Overdue: ${daysOverdue} ${daysOverdue === 1 ? 'DAY' : 'DAYS'}

${totalLateFees > 0 ? `
LATE FEE CALCULATION:
- Late Fee per Day: $${lateFeePerDay.toFixed(2)}
- Days Overdue: ${daysOverdue}
- Total Late Fees: $${totalLateFees.toFixed(2)}

Note: Late fees will continue to accrue daily until cylinder is returned.
` : ''}

RETURN LOCATION:
${outletName}
${outletLocation}
${outletPhone ? `Phone: ${outletPhone}` : ''}

HOW TO RETURN:
1. Bring cylinder to return location above
2. Have lease ID (${leaseId}) ready
3. Complete inspection and paperwork
4. Receive return confirmation

${noticeType === 'final' ? `
CONSEQUENCES OF NON-RETURN:
- Additional penalties and collection fees
- Credit agency reporting
- Legal action to recover cylinder
- Suspension of future leasing privileges
` : ''}

NEED HELP?
Contact us immediately: ${supportEmail}
${outletPhone ? `Call: ${outletPhone}` : ''}

Please arrange for immediate return of cylinder ${cylinderCode} to avoid additional charges.

Best regards,
The ${companyName} Team
    `.trim();
  }
}