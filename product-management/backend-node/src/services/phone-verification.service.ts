// Phone verification service for development
// In production, integrate with Twilio or similar SMS service

import * as fs from 'fs';
import * as path from 'path';

export interface PhoneVerificationOptions {
  phoneNumber: string;
  code: string;
}

export const sendPhoneVerification = async (options: PhoneVerificationOptions): Promise<boolean> => {
  // For development, log and save verification code to file
  console.log('====================================');
  console.log('📱 SMS SENT (DEV MODE)');
  console.log('====================================');
  console.log(`To: ${options.phoneNumber}`);
  console.log(`Verification Code: ${options.code}`);
  console.log('====================================\n');
  
  // Save verification code to file in development mode
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Use absolute path as specified
      const emailsDir = path.join('C:', 'Users', 'Owner', 'Documents', 'ai-services-platform', 
                                   'product-management', 'backend-node', 'emails');
      
      if (!fs.existsSync(emailsDir)) {
        fs.mkdirSync(emailsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedPhone = options.phoneNumber.replace(/[^0-9]/g, '');
      const filename = `${timestamp}_SMS_${sanitizedPhone}.txt`;
      const filepath = path.join(emailsDir, filename);
      
      const content = `
====================================
📱 SMS VERIFICATION CODE
====================================
Date: ${new Date().toLocaleString()}
To: ${options.phoneNumber}
Verification Code: ${options.code}
====================================

Message sent to user:
"Your verification code is: ${options.code}

This code will expire in 15 minutes.

AI Services Platform"
====================================
`;
      
      fs.writeFileSync(filepath, content);
      console.log(`✅ SMS verification code saved to: ${filepath}`);
      console.log(`   Code: ${options.code}\n`);
    } catch (error) {
      console.error('❌ Failed to save SMS verification to file:', error);
    }
  }
  
  // In production, integrate with Twilio or similar:
  // const twilio = require('twilio');
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({
  //   body: `Your verification code is: ${options.code}`,
  //   from: twilioPhoneNumber,
  //   to: options.phoneNumber
  // });
  
  return true;
};
