export interface EmailTemplateData {
  [key: string]: any;
}

export abstract class BaseEmailTemplate<T extends EmailTemplateData = EmailTemplateData> {
  protected data: T;

  constructor(data: T) {
    this.data = data;
  }

  abstract getSubject(): string;
  abstract getHtml(): string;
  abstract getText(): string;

  protected getBaseHtml(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.getSubject()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .email-wrapper {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .email-header {
            background-color: #4F46E5;
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .email-body {
            padding: 40px 30px;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            margin: 20px 0;
            background-color: #4F46E5;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #4338CA;
        }
        .text-muted {
            color: #6c757d;
            font-size: 14px;
        }
        .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
            .container {
                padding: 10px;
            }
            .email-body {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-wrapper">
            ${content}
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  protected getHeader(title: string): string {
    return `
      <div class="email-header">
          <h1>${title}</h1>
      </div>
    `;
  }

  protected getFooter(companyName: string = 'Your Company'): string {
    const year = new Date().getFullYear();
    return `
      <div class="email-footer">
          <p>&copy; ${year} ${companyName}. All rights reserved.</p>
          <p class="text-muted">
              This email was sent to you because you have an account with us.
              If you have any questions, please contact our support team.
          </p>
      </div>
    `;
  }
}