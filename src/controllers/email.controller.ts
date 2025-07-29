import { Request, Response } from 'express';
import { emailService } from '@services/email/EmailService';
import { CustomerRegistrationEmail } from '@services/email/templates/CustomerRegistrationEmail';
import { CustomerWelcomeEmail } from '@services/email/templates/CustomerWelcomeEmail';
import { WelcomeEmail } from '@services/email/templates/WelcomeEmail';
import { ResponseUtil } from '@utils/response';
import { asyncHandler } from '@utils/asyncHandler';
import { config } from '@config/environment';

export class EmailController {
  // Test email connection
  testConnection = asyncHandler(async (req: Request, res: Response) => {
    const isConnected = await emailService.verifyConnection();
    
    return ResponseUtil.success(res, { 
      connected: isConnected,
      provider: config.email.provider,
      from: config.email.from
    }, isConnected ? 'Email connection successful' : 'Email connection failed');
  });

  // Test customer registration email
  testCustomerRegistration = asyncHandler(async (req: Request, res: Response) => {
    const { email = 'test@example.com', firstName = 'John' } = req.body;
    
    const template = new CustomerRegistrationEmail({
      firstName,
      email,
      paymentLink: 'https://example.com/payment/test-123',
      amount: 5000,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      companyName: config.companyName
    });

    const result = await emailService.sendTemplate(email, template);
    
    return ResponseUtil.success(res, result, 
      result.success ? 'Customer registration email sent successfully' : 'Failed to send email');
  });

  // Test customer welcome email
  testCustomerWelcome = asyncHandler(async (req: Request, res: Response) => {
    const { email = 'test@example.com', firstName = 'John' } = req.body;
    
    const template = new CustomerWelcomeEmail({
      firstName,
      email,
      activationDate: new Date(),
      supportEmail: config.supportEmail,
      companyName: config.companyName
    });

    const result = await emailService.sendTemplate(email, template);
    
    return ResponseUtil.success(res, result, 
      result.success ? 'Customer welcome email sent successfully' : 'Failed to send email');
  });

  // Test general welcome email
  testWelcomeEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email = 'test@example.com', firstName = 'John' } = req.body;
    
    const template = new WelcomeEmail({
      firstName,
      email,
      loginUrl: `${config.frontendUrl}/login`,
      companyName: config.companyName
    });

    const result = await emailService.sendTemplate(email, template);
    
    return ResponseUtil.success(res, result, 
      result.success ? 'Welcome email sent successfully' : 'Failed to send email');
  });

  // Test plain email
  testPlainEmail = asyncHandler(async (req: Request, res: Response) => {
    const { 
      to = 'test@example.com', 
      subject = 'Test Email', 
      text = 'This is a test email from CylinderX API',
      html 
    } = req.body;
    
    const result = await emailService.sendEmail({
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`
    });
    
    return ResponseUtil.success(res, result, 
      result.success ? 'Plain email sent successfully' : 'Failed to send email');
  });

  // Get email template preview
  getTemplatePreview = asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const { firstName = 'John', email = 'test@example.com' } = req.query;

    let template;
    let htmlContent = '';
    let textContent = '';

    switch (type) {
      case 'customer-registration':
        template = new CustomerRegistrationEmail({
          firstName: firstName as string,
          email: email as string,
          paymentLink: 'https://example.com/payment/test-123',
          amount: 5000,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          companyName: config.companyName
        });
        break;
        
      case 'customer-welcome':
        template = new CustomerWelcomeEmail({
          firstName: firstName as string,
          email: email as string,
          activationDate: new Date(),
          supportEmail: config.supportEmail,
          companyName: config.companyName
        });
        break;
        
      case 'welcome':
        template = new WelcomeEmail({
          firstName: firstName as string,
          email: email as string,
          loginUrl: `${config.frontendUrl}/login`,
          companyName: config.companyName
        });
        break;
        
      default:
        return ResponseUtil.error(res, 'Invalid template type', 400);
    }

    if (template) {
      htmlContent = template.getHtml();
      textContent = template.getText();
    }

    return ResponseUtil.success(res, {
      type,
      subject: template?.getSubject(),
      html: htmlContent,
      text: textContent
    }, 'Template preview generated');
  });

  // List all available templates
  listTemplates = asyncHandler(async (req: Request, res: Response) => {
    const templates = [
      {
        type: 'customer-registration',
        name: 'Customer Registration',
        description: 'Email sent to customers after registration with payment link'
      },
      {
        type: 'customer-welcome',
        name: 'Customer Welcome',
        description: 'Email sent to customers after successful account activation'
      },
      {
        type: 'welcome',
        name: 'General Welcome',
        description: 'General welcome email for new users'
      }
    ];

    return ResponseUtil.success(res, { templates }, 'Available email templates');
  });
}

export const emailController = new EmailController();