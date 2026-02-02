// Mock email service for development
// In production, integrate with SendGrid, AWS SES, or similar

import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // For development, log and save email to file
  console.log('====================================');
  console.log('📧 EMAIL SENT (DEV MODE)');
  console.log('====================================');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log('====================================\n');
  
  // Save email to file in development mode
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Use absolute path as specified
      const emailsDir = path.join('C:', 'Users', 'Owner', 'Documents', 'ai-services-platform', 
                                   'product-management', 'backend-node', 'emails');
      
      if (!fs.existsSync(emailsDir)) {
        fs.mkdirSync(emailsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedEmail = options.to.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${timestamp}_${sanitizedEmail}.html`;
      const filepath = path.join(emailsDir, filename);
      
      fs.writeFileSync(filepath, options.html);
      console.log(`✅ Email saved to: ${filepath}`);
      console.log('   You can open this file in your browser to view the content.\n');
    } catch (error) {
      console.error('❌ Failed to save email to file:', error);
    }
  }
  
  // In production, integrate with a real email service:
  // const nodemailer = require('nodemailer');
  // const transporter = nodemailer.createTransport({...config});
  // await transporter.sendMail(options);
  
  return true;
};

export const sendVerificationEmail = async (
  email: string, 
  name: string, 
  verificationToken: string,
  isNewCompany: boolean,
  tenantId: string
): Promise<boolean> => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to AI Services Platform</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.8; 
          color: #333; 
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0;
          font-size: 16px;
          opacity: 0.95;
        }
        .content { 
          background: white; 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 20px;
          font-size: 16px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 20px;
        }
        .highlight-box {
          background: #f8f9ff;
          border-left: 4px solid #667eea;
          padding: 15px 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .link-text {
          font-size: 13px;
          color: #666;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          word-break: break-all;
          margin: 20px 0;
        }
        .link-text a {
          color: #667eea;
          text-decoration: none;
        }
        .footer { 
          background: #f9f9f9;
          text-align: center; 
          padding: 30px;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          margin: 5px 0;
          font-size: 13px;
          color: #666;
        }
        .emoji {
          font-size: 24px;
          margin-right: 8px;
        }
        .steps {
          list-style: none;
          padding: 0;
          counter-reset: step-counter;
        }
        .steps li {
          counter-increment: step-counter;
          margin: 15px 0;
          padding-left: 40px;
          position: relative;
        }
        .steps li:before {
          content: counter(step-counter);
          position: absolute;
          left: 0;
          top: 0;
          background: #667eea;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1><span class="emoji">🎉</span> Welcome to AI Services Platform!</h1>
          <p>We're excited to have you on board</p>
        </div>
        
        <div class="content">
          <p class="greeting">Hello ${name},</p>
          
          ${isNewCompany ? `
          <p>Congratulations on creating your company account with AI Services Platform! 🎉</p>
          
          <p>We're thrilled to welcome you as a new company to our community of innovative businesses leveraging cutting-edge AI solutions. As the company administrator, you'll have full control over your workspace.</p>
          ` : `
          <p>Welcome to your company's AI Services Platform workspace!</p>
          
          <p>Your company administrator has set up an account for you. We're excited to have you join the team and start collaborating on AI-powered solutions.</p>
          
          <div style="background: #f8f9ff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #666; font-weight: 600;">YOUR COMPANY TENANT ID</p>
            <p style="margin: 0; font-size: 20px; font-weight: bold; color: #667eea; font-family: 'Courier New', monospace;">${tenantId}</p>
          </div>
          `}
          
          <p>To get started and ensure the security of your account, please verify your email address by clicking the button below:</p>
          
          <div class="button-container">
            <a href="${verificationUrl}" class="button">
              ✓ Verify My Email Address
            </a>
          </div>
          
          ${isNewCompany ? `
          <div class="highlight-box">
            <p style="margin: 0; font-weight: 600; color: #667eea;">📋 What's Next?</p>
            <p style="margin: 10px 0 0; font-size: 14px;">After verifying your email, you'll be guided through setting up your company profile where you can:</p>
            <ul class="steps" style="margin-top: 15px;">
              <li>Add your company information and details</li>
              <li>Configure AI services for your organization</li>
              <li>Invite team members to join your workspace</li>
              <li>Set up billing and subscription preferences</li>
            </ul>
          </div>
          ` : `
          <div class="highlight-box">
            <p style="margin: 0; font-weight: 600; color: #667eea;">🚀 You're Almost There!</p>
            <p style="margin: 10px 0 0; font-size: 14px;">Once verified, you'll have full access to your company's AI services workspace. You can:</p>
            <ul class="steps" style="margin-top: 15px;">
              <li>Access all company AI services and tools</li>
              <li>Collaborate with your team members</li>
              <li>View company reports and analytics</li>
            </ul>
          </div>
          `}
          
          <div class="link-text">
            <strong>Having trouble with the button?</strong><br>
            Copy and paste this link into your browser:<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </div>
          
          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            ⏱️ <em>This verification link will expire in 24 hours for security purposes.</em>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Need help?</strong> Contact our support team at support@aiservices.com</p>
          <p style="margin-top: 15px;">If you didn't create this account, please ignore this email or contact us if you have concerns.</p>
          <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} AI Services Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: '🎉 Welcome! Verify Your Email - AI Services Platform',
    html
  });
};

export const sendCompanySetupCompleteEmail = async (
  email: string,
  name: string,
  companyName: string,
  tenantId: string
): Promise<boolean> => {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?tenantId=${encodeURIComponent(tenantId)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Company Setup Complete</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.8; 
          color: #333; 
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0;
          font-size: 16px;
          opacity: 0.95;
        }
        .content { 
          background: white; 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 20px;
          font-size: 16px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 20px;
        }
        .tenant-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          text-align: center;
          color: white;
        }
        .tenant-box h2 {
          margin: 0 0 15px;
          font-size: 18px;
          opacity: 0.95;
        }
        .tenant-id {
          background: white;
          color: #667eea;
          padding: 20px;
          border-radius: 8px;
          font-size: 24px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          word-break: break-all;
          margin: 15px 0;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .info-box {
          background: #f8f9ff;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .link-text {
          font-size: 13px;
          color: #666;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          word-break: break-all;
          margin: 20px 0;
        }
        .link-text a {
          color: #667eea;
          text-decoration: none;
        }
        .footer { 
          background: #f9f9f9;
          text-align: center; 
          padding: 30px;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          margin: 5px 0;
          font-size: 13px;
          color: #666;
        }
        .emoji {
          font-size: 24px;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1><span class="emoji">🎊</span> Company Setup Complete!</h1>
          <p>Your workspace is ready to go</p>
        </div>
        
        <div class="content">
          <p class="greeting">Hello ${name},</p>
          
          <p>Fantastic news! Your company <strong>${companyName}</strong> has been successfully set up on AI Services Platform! 🚀</p>
          
          <p>Your permanent company workspace is now active and ready for you and your team to start using.</p>
          
          <div class="tenant-box">
            <h2>🔑 Your Company Tenant ID</h2>
            <div class="tenant-id">${tenantId}</div>
            <p style="margin: 15px 0 0; font-size: 14px; opacity: 0.9;">Save this ID - you'll need it to sign in and invite team members</p>
          </div>
          
          <div class="info-box">
            <p style="margin: 0 0 10px; font-weight: 600; color: #667eea;">📌 Important: Share with Your Team</p>
            <p style="margin: 0; font-size: 14px;">When inviting team members to join your workspace, they'll need your Tenant ID to sign up. Make sure to share this with anyone joining your team.</p>
          </div>
          
          <p>Click the button below to sign in and start exploring your workspace:</p>
          
          <div class="button-container">
            <a href="${loginUrl}" class="button">
              🚀 Sign In to Your Workspace
            </a>
          </div>
          
          <div class="info-box">
            <p style="margin: 0 0 10px; font-weight: 600; color: #667eea;">✨ What You Can Do Next:</p>
            <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 14px;">
              <li style="margin: 8px 0;">Explore your AI services dashboard</li>
              <li style="margin: 8px 0;">Invite team members to collaborate</li>
              <li style="margin: 8px 0;">Configure your AI service settings</li>
              <li style="margin: 8px 0;">Set up billing and subscription preferences</li>
            </ul>
          </div>
          
          <div class="link-text">
            <strong>Having trouble with the button?</strong><br>
            Copy and paste this link into your browser:<br>
            <a href="${loginUrl}">${loginUrl}</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Need help?</strong> Contact our support team at support@aiservices.com</p>
          <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} AI Services Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: `🎊 ${companyName} - Your Company Setup is Complete!`,
    html
  });
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tenantId: string
): Promise<boolean> => {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to AI Services Platform</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.8; 
          color: #333; 
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          background: white; 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 20px;
          font-size: 16px;
        }
        .tenant-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
          color: white;
        }
        .tenant-id {
          background: white;
          color: #667eea;
          padding: 15px;
          border-radius: 8px;
          font-size: 20px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          margin: 10px 0;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .footer { 
          background: #f9f9f9;
          text-align: center; 
          padding: 30px;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>🎉 Welcome to AI Services Platform!</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; font-weight: 600; color: #667eea;">Hello ${name},</p>
          
          <p>Great news! Your workspace has been successfully created and is ready to use. 🚀</p>
          
          <div class="tenant-box">
            <h2 style="margin: 0 0 10px; font-size: 16px;">Your Tenant ID</h2>
            <div class="tenant-id">${tenantId}</div>
            <p style="margin: 10px 0 0; font-size: 13px; opacity: 0.9;">Use this ID when logging in</p>
          </div>
          
          <p>You can now sign in to your workspace and start using our AI services:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button">Sign In Now</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Need help? Contact support@aiservices.com</p>
          <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} AI Services Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: '🎉 Your Workspace is Ready - AI Services Platform',
    html
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  tenantId: string
): Promise<boolean> => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.8; 
          color: #333; 
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          background: white; 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 20px;
          font-size: 16px;
        }
        .warning-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .link-text {
          font-size: 13px;
          color: #666;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          word-break: break-all;
          margin: 20px 0;
        }
        .footer { 
          background: #f9f9f9;
          text-align: center; 
          padding: 30px;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; font-weight: 600; color: #667eea;">Password Reset Requested</p>
          
          <p>We received a request to reset the password for your account with tenant ID <strong>${tenantId}</strong>.</p>
          
          <p>Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <div class="link-text">
            <strong>Having trouble with the button?</strong><br>
            Copy and paste this link into your browser:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </div>
          
          <div class="warning-box">
            <p style="margin: 0; font-weight: 600;">⚠️ Important Security Information</p>
            <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 14px;">
              <li>This link expires in 24 hours</li>
              <li>If you didn't request this reset, ignore this email</li>
              <li>Your password won't change until you create a new one</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>For security concerns, contact support@aiservices.com</p>
          <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} AI Services Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: '🔐 Password Reset Request - AI Services Platform',
    html
  });
};

export const sendPasswordResetConfirmationEmail = async (
  email: string
): Promise<boolean> => {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.8; 
          color: #333; 
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          background: white; 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 20px;
          font-size: 16px;
        }
        .success-box {
          background: #d1fae5;
          border-left: 4px solid #10b981;
          padding: 15px 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .footer { 
          background: #f9f9f9;
          text-align: center; 
          padding: 30px;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>✅ Password Reset Successful</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; font-weight: 600; color: #10b981;">Password Updated Successfully!</p>
          
          <p>Your password has been successfully reset. You can now sign in with your new password.</p>
          
          <div class="success-box">
            <p style="margin: 0; font-weight: 600; color: #059669;">🔒 Your Account is Secure</p>
            <p style="margin: 10px 0 0; font-size: 14px;">If you didn't make this change, please contact us immediately.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button">Sign In Now</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Questions? Contact support@aiservices.com</p>
          <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} AI Services Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: '✅ Password Reset Successful - AI Services Platform',
    html
  });
};
