import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email is configured
    const emailConfig = this.getEmailConfig();
    
    if (emailConfig) {
      this.transporter = nodemailer.createTransporter(emailConfig);
      this.isConfigured = true;
    } else {
      // Use mock transporter for development
      this.transporter = nodemailer.createTransporter({
        jsonTransport: true
      });
      this.isConfigured = false;
    }
  }

  private getEmailConfig(): EmailConfig | null {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      return {
        host,
        port: parseInt(port),
        secure: port === '465',
        auth: { user, pass }
      };
    }

    return null;
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@finbot.com',
        to,
        subject: template.subject,
        text: template.text,
        html: template.html
      };

      if (this.isConfigured) {
        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}: ${template.subject}`);
      } else {
        // Mock email sending for development
        console.log(`📧 [MOCK] Email would be sent to ${to}:`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Text: ${template.text}`);
      }

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  generatePasswordResetTemplate(token: string, baseUrl: string = 'http://localhost:5179'): EmailTemplate {
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    return {
      subject: 'FinBot - Şifre Sıfırlama',
      text: `Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:\n\n${resetUrl}\n\nBu link 1 saat geçerlidir.\n\nEğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">FinBot - Şifre Sıfırlama</h2>
          <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Şifremi Sıfırla
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Bu link 1 saat geçerlidir.<br>
            Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.
          </p>
        </div>
      `
    };
  }

  generateEmailVerificationTemplate(verificationCode: string): EmailTemplate {
    return {
      subject: 'FinBot - E-posta Doğrulama',
      text: `E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın:\n\n${verificationCode}\n\nBu kod 10 dakika geçerlidir.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">FinBot - E-posta Doğrulama</h2>
          <p>E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="background-color: #f3f4f6; color: #1f2937; padding: 12px 24px; font-size: 24px; font-weight: bold; border-radius: 6px; display: inline-block; letter-spacing: 4px;">
              ${verificationCode}
            </span>
          </div>
          <p style="color: #666; font-size: 14px;">
            Bu kod 10 dakika geçerlidir.
          </p>
        </div>
      `
    };
  }

  generateTeamInviteTemplate(teamName: string, inviteToken: string, baseUrl: string = 'http://localhost:5179'): EmailTemplate {
    const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;
    
    return {
      subject: `FinBot - ${teamName} Takımına Davet`,
      text: `${teamName} takımına davet edildiniz.\n\nDaveti kabul etmek için aşağıdaki linke tıklayın:\n\n${inviteUrl}\n\nBu link 7 gün geçerlidir.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">FinBot - Takım Daveti</h2>
          <p><strong>${teamName}</strong> takımına davet edildiniz.</p>
          <p>Daveti kabul etmek için aşağıdaki butona tıklayın:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Daveti Kabul Et
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Bu link 7 gün geçerlidir.
          </p>
        </div>
      `
    };
  }
}

export const emailService = new EmailService();

