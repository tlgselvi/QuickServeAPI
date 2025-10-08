import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

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
      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;
    } else {
      // Use mock transporter for development
      this.transporter = nodemailer.createTransport({
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
        logger.info(`✅ Email sent to ${to}: ${template.subject}`);
      } else {
        // Mock email sending for development
        logger.info(`📧 [MOCK] Email would be sent to ${to}:`);
        logger.info(`Subject: ${template.subject}`);
        logger.info(`Text: ${template.text}`);
      }

      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      return false;
    }
  }

  generatePasswordResetTemplate(token: string, baseUrl: string = (process.env.FRONTEND_URL || 'http://localhost:5000')): EmailTemplate {
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

  generateEmailVerificationTemplate(verificationCode: string, baseUrl: string = (process.env.FRONTEND_URL || 'http://localhost:5000')): EmailTemplate {
    const verifyUrl = `${baseUrl}/verify-email?code=${verificationCode}`;
    
    return {
      subject: 'FinBot - E-posta Doğrulama',
      text: `E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın:\n\n${verificationCode}\n\nVeya aşağıdaki linke tıklayın:\n${verifyUrl}\n\nBu kod 10 dakika geçerlidir.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>E-posta Doğrulama</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .code { background: #f3f4f6; color: #1f2937; padding: 20px; font-size: 32px; font-weight: bold; border-radius: 8px; display: inline-block; letter-spacing: 8px; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #fef3cd; border: 1px solid #fde68a; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 FinBot E-posta Doğrulama</h1>
            </div>
            <div class="content">
              <h2>Merhaba!</h2>
              <p>FinBot hesabınızı oluşturduğunuz için teşekkürler! E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
              
              <div style="text-align: center;">
                <div class="code">${verificationCode}</div>
              </div>
              
              <div style="text-align: center;">
                <a href="${verifyUrl}" class="button">E-postamı Doğrula</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Önemli:</strong>
                <ul>
                  <li>Bu kod <strong>10 dakika</strong> geçerlidir</li>
                  <li>Güvenlik için sadece bir kez kullanılabilir</li>
                  <li>Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz</li>
                </ul>
              </div>
              
              <p>Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${verifyUrl}
              </p>
            </div>
            <div class="footer">
              <p>Bu e-posta FinBot sistemi tarafından otomatik olarak gönderilmiştir.</p>
              <p>© 2024 FinBot. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  generateTeamInviteTemplate(teamName: string, inviteToken: string, inviterName: string = 'Takım Yöneticisi', baseUrl: string = (process.env.FRONTEND_URL || 'http://localhost:5000')): EmailTemplate {
    const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;
    
    return {
      subject: `FinBot - ${teamName} Takımına Davet`,
      text: `${inviterName} sizi ${teamName} takımına davet etti.\n\nDaveti kabul etmek için aşağıdaki linke tıklayın:\n\n${inviteUrl}\n\nBu link 7 gün geçerlidir.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Takım Daveti</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #fef3cd; border: 1px solid #fde68a; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .team-info { background: #e0f2fe; border: 1px solid #81d4fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👥 FinBot Takım Daveti</h1>
            </div>
            <div class="content">
              <h2>Merhaba!</h2>
              <p><strong>${inviterName}</strong> sizi <strong>${teamName}</strong> takımına davet etti.</p>
              
              <div class="team-info">
                <h3>🏢 Takım Bilgileri</h3>
                <p><strong>Takım Adı:</strong> ${teamName}</p>
                <p><strong>Davet Eden:</strong> ${inviterName}</p>
                <p><strong>Davet Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
              </div>
              
              <p>FinBot'ta takım çalışması yaparak finansal verilerinizi daha etkili yönetebilirsiniz.</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Daveti Kabul Et</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Önemli:</strong>
                <ul>
                  <li>Bu link <strong>7 gün</strong> geçerlidir</li>
                  <li>Daveti kabul etmek için FinBot hesabınız olmalı</li>
                  <li>Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz</li>
                </ul>
              </div>
              
              <p>Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${inviteUrl}
              </p>
            </div>
            <div class="footer">
              <p>Bu e-posta FinBot sistemi tarafından otomatik olarak gönderilmiştir.</p>
              <p>© 2024 FinBot. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }
}

export const emailService = new EmailService();

