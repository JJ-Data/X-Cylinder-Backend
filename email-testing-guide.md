# Email Testing Guide for CylinderX

## Overview
This guide provides comprehensive instructions for testing the email functionality in the CylinderX application.

## ⚠️ Issues Fixed
1. **Customer Service Email Import** - Fixed import from placeholder service to proper EmailService
2. **Email Template Implementation** - Created professional HTML email templates
3. **API Consistency** - Updated all email service calls to use proper EmailOptions interface
4. **Testing Infrastructure** - Added comprehensive email testing endpoints

## Email Configuration

### Environment Variables Required
Add these to your `.env` file:

```bash
# Email Configuration
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@your-domain.com
EMAIL_REPLY_TO=support@your-domain.com

# SMTP Configuration (for development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SECURE=false

# For production, use other providers:
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=your-resend-api-key

# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=your-sendgrid-api-key

# EMAIL_PROVIDER=aws-ses
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Email Testing Endpoints

### 1. Test Email Connection
```bash
GET /api/v1/emails/test/connection
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Email connection successful",
  "data": {
    "connected": true,
    "provider": "smtp",
    "from": "noreply@your-domain.com"
  }
}
```

### 2. Test Customer Registration Email
```bash
POST /api/v1/emails/test/customer-registration
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "customer@example.com",
  "firstName": "John"
}
```

### 3. Test Customer Welcome Email
```bash
POST /api/v1/emails/test/customer-welcome
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "customer@example.com",
  "firstName": "John"
}
```

### 4. Test Plain Email
```bash
POST /api/v1/emails/test/plain
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "text": "This is a test email",
  "html": "<p>This is a <strong>test email</strong></p>"
}
```

### 5. Preview Email Templates
```bash
# List all templates
GET /api/v1/emails/templates

# Preview specific template
GET /api/v1/emails/templates/customer-registration/preview?firstName=John&email=test@example.com
GET /api/v1/emails/templates/customer-welcome/preview?firstName=John&email=test@example.com
```

## Email Touchpoints in Application

### 1. Customer Registration (`customer.service.ts:96-108`)
- **Trigger**: When a new customer registers
- **Template**: `CustomerRegistrationEmail`
- **Content**: Registration confirmation with payment link
- **Test**: Register a new customer through the API

### 2. Customer Activation (`customer.service.ts:167-179`)
- **Trigger**: When customer completes payment and account is activated
- **Template**: `CustomerWelcomeEmail`
- **Content**: Welcome message with account details and next steps
- **Test**: Activate a pending customer account

### 3. Payment Reminders (`customer.service.ts:405-410`)
- **Trigger**: When resending payment link to pending customers
- **Template**: Plain email with reminder content
- **Content**: Payment reminder with updated link
- **Test**: Call resend payment link endpoint

### 4. Authentication Emails (`auth.service.ts`)
- **Password Reset**: Email with password reset link
- **Email Verification**: Email verification link
- **Login Notifications**: Security notifications

## Development Email Testing

### Option 1: Mailtrap (Recommended for Development)
```bash
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-username
EMAIL_PASSWORD=your-mailtrap-password
EMAIL_FROM=test@cylinderx.com
```

### Option 2: Gmail SMTP (Quick Setup)
1. Enable 2-factor authentication on Gmail
2. Generate App Password
3. Use app password in EMAIL_PASSWORD

### Option 3: Local MailHog
```bash
# Run MailHog locally
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Configure
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=
EMAIL_PASSWORD=
```

## Production Email Providers

### Resend (Recommended)
- Modern, developer-friendly
- Good deliverability
- Simple setup

### SendGrid
- Enterprise-grade
- Advanced analytics
- High volume support

### AWS SES
- Cost-effective
- Integrates with AWS infrastructure
- Requires domain verification

## Testing Checklist

### ✅ Basic Email Functionality
- [ ] Email connection test passes
- [ ] Plain email sends successfully
- [ ] Template preview generates correctly

### ✅ Customer Registration Flow
- [ ] Registration email sent when customer registers
- [ ] Email contains payment link and correct details
- [ ] Email formatting is professional and readable

### ✅ Customer Activation Flow
- [ ] Welcome email sent when customer activates
- [ ] Email contains account details and next steps
- [ ] Email formatting is professional and readable

### ✅ Error Handling
- [ ] Email failures don't break registration/activation
- [ ] Errors are logged properly
- [ ] Graceful degradation when email service is down

### ✅ Email Content Verification
- [ ] Correct customer name in personalization
- [ ] Valid payment links and amounts
- [ ] Proper company branding and contact info
- [ ] Mobile-responsive email templates

## Troubleshooting

### Common Issues

1. **"Connection Failed"**
   - Check EMAIL_HOST, EMAIL_PORT settings
   - Verify EMAIL_USER and EMAIL_PASSWORD
   - Check firewall/network restrictions

2. **"Authentication Failed"**
   - Verify email credentials
   - For Gmail, use App Password, not regular password
   - Check if 2FA is enabled

3. **"Template Not Found"**
   - Ensure template files are in correct directory
   - Check import statements in controllers
   - Verify template class names

4. **"Email Not Received"**
   - Check spam/junk folders
   - Verify recipient email address
   - Check email provider logs
   - Test with different email addresses

### Debug Mode
Set `LOG_LEVEL=debug` in your `.env` file to see detailed email sending logs.

## Next Steps

1. **Configure Email Provider**: Choose and configure your preferred email provider
2. **Test Connection**: Use the connection test endpoint to verify setup
3. **Test Templates**: Send test emails using the provided endpoints
4. **Verify Customer Flow**: Register and activate a test customer
5. **Monitor Delivery**: Check email delivery and formatting
6. **Production Setup**: Configure production email provider and DNS records

## Support

For issues with email functionality:
1. Check the application logs for detailed error messages
2. Use the email testing endpoints to isolate issues
3. Verify email provider configuration and credentials
4. Test with different email addresses and providers