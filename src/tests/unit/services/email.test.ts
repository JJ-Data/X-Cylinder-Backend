import { EmailService } from '@services/email/EmailService';
import { SMTPProvider } from '@services/email/providers/SMTPProvider';
import { SendGridProvider } from '@services/email/providers/SendGridProvider';
import { AWSEmailProvider } from '@services/email/providers/AWSEmailProvider';
import { ResendProvider } from '@services/email/providers/ResendProvider';
import { createMockEmailData, createMockUser } from '@tests/helpers/factories';
import { config } from '@config/environment';

// Mock all providers
jest.mock('@services/email/providers/SMTPProvider');
jest.mock('@services/email/providers/SendGridProvider');
jest.mock('@services/email/providers/AWSEmailProvider');
jest.mock('@services/email/providers/ResendProvider');
jest.mock('@utils/logger');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock provider send method
    mockProvider = {
      send: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };

    // Mock all provider constructors
    (SMTPProvider as any).mockImplementation(() => mockProvider);
    (SendGridProvider as any).mockImplementation(() => mockProvider);
    (AWSEmailProvider as any).mockImplementation(() => mockProvider);
    (ResendProvider as any).mockImplementation(() => mockProvider);
  });

  describe('initialization', () => {
    it('should initialize with SMTP provider by default', () => {
      config.email.provider = 'smtp';
      emailService = EmailService.getInstance();
      expect(SMTPProvider).toHaveBeenCalled();
    });

    it('should initialize with SendGrid provider', () => {
      config.email.provider = 'sendgrid';
      emailService = EmailService.getInstance();
      expect(SendGridProvider).toHaveBeenCalled();
    });

    it('should initialize with AWS SES provider', () => {
      config.email.provider = 'aws-ses';
      emailService = EmailService.getInstance();
      expect(AWSEmailProvider).toHaveBeenCalled();
    });

    it('should initialize with Resend provider', () => {
      config.email.provider = 'resend';
      emailService = EmailService.getInstance();
      expect(ResendProvider).toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      config.email.provider = 'smtp';
      emailService = EmailService.getInstance();
    });

    it('should send email successfully', async () => {
      const emailData = createMockEmailData();
      const result = await emailService.sendEmail(emailData);

      expect(mockProvider.send).toHaveBeenCalledWith(emailData);
      expect(result).toEqual({ messageId: 'test-message-id' });
    });

    it('should add default from address if not provided', async () => {
      const emailData = createMockEmailData();
      await emailService.sendEmail(emailData);

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: config.email.from,
        })
      );
    });

    it('should handle provider errors gracefully', async () => {
      mockProvider.send.mockRejectedValueOnce(new Error('Provider error'));
      const emailData = createMockEmailData();

      await expect(emailService.sendEmail(emailData)).rejects.toThrow('Provider error');
    });
  });

  describe('email templates', () => {
    beforeEach(() => {
      config.email.provider = 'smtp';
      emailService = EmailService.getInstance();
    });

    it('should send welcome email', async () => {
      const user = createMockUser();
      await emailService.sendWelcomeEmail(user.email, user.firstName);

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining('Welcome'),
        })
      );
    });

    it('should send password reset email', async () => {
      const email = 'test@example.com';
      const resetToken = 'reset-token-123';
      const userName = 'Test User';

      await emailService.sendPasswordResetEmail(email, resetToken, userName);

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.stringContaining('Password Reset'),
          html: expect.stringContaining(resetToken),
        })
      );
    });

    it('should send email verification email', async () => {
      const email = 'test@example.com';
      const verificationToken = 'verify-token-123';
      const userName = 'Test User';

      await emailService.sendEmailVerificationEmail(email, verificationToken, userName);

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.stringContaining('Verify'),
          html: expect.stringContaining(verificationToken),
        })
      );
    });

    it('should send password change confirmation', async () => {
      const email = 'test@example.com';
      const userName = 'Test User';

      await emailService.sendPasswordChangeConfirmation(email, userName);

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.stringContaining('Password'),
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      config.email.provider = 'smtp';
      emailService = EmailService.getInstance();
    });

    it('should retry on temporary failures', async () => {
      mockProvider.send
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      const emailData = createMockEmailData();
      const result = await emailService.sendEmail(emailData);

      expect(mockProvider.send).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ messageId: 'test-message-id' });
    });

    it('should throw error after max retries', async () => {
      mockProvider.send.mockRejectedValue(new Error('Permanent failure'));
      const emailData = createMockEmailData();

      await expect(emailService.sendEmail(emailData)).rejects.toThrow('Permanent failure');
    });
  });
});
