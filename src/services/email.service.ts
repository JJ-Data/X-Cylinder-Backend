// Email service implementation placeholder
export class EmailService {
  async sendEmail(to: string, subject: string, content: string): Promise<void> {
    // Implementation will be added later
    console.log(`Email would be sent to ${to} with subject: ${subject}`);
  }
}

export const emailService = new EmailService();