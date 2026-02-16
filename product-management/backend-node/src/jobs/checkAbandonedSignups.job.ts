import ProductSignupSessionModel from '../models/ProductSignupSession';
import ProductModel from '../models/Product';
import UserModel from '../models/User';
import { sendSignupReminderEmail } from '../services/email.service';

/**
 * Background Job: Check Abandoned Signups
 * Phase 2: Email Notifications System
 *
 * Runs every 5 minutes to find signup sessions that:
 * - Are in payment-validated step (per user requirement)
 * - Have not been completed
 * - Were created 15 minutes ago (inactive but within reminder window)
 * - Haven't been reminded yet
 * - Haven't expired yet
 *
 * Sends one reminder email per session, then marks as reminded
 */

export const checkAbandonedSignupsTask = async (): Promise<void> => {
  try {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    console.log('[AbandonedSignupsJob] Starting check...');

    // Find sessions that meet criteria
    const abandonedSessions = await ProductSignupSessionModel.find({
      // Only sessions saved after payment validation (per user requirement)
      currentStep: 'payment-validated',

      // Not completed or cancelled
      completedSubscriptionId: null,
      cancelledAt: null,

      // Created 15+ minutes ago (giving time for user to complete)
      createdAt: { $lte: fifteenMinutesAgo },

      // Last accessed 10+ minutes ago (truly abandoned)
      lastAccessedAt: { $lte: tenMinutesAgo },

      // Not expired yet
      expiresAt: { $gt: now },

      // Not already reminded
      'metadata.reminderSent': { $ne: true }
    }).limit(50); // Process max 50 per run to avoid overload

    if (abandonedSessions.length === 0) {
      console.log('[AbandonedSignupsJob] No abandoned sessions found');
      return;
    }

    console.log(`[AbandonedSignupsJob] Found ${abandonedSessions.length} abandoned session(s)`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const session of abandonedSessions) {
      try {
        // Fetch product details
        const product = await ProductModel.findById(session.productId);

        if (!product) {
          console.warn(`[AbandonedSignupsJob] Product not found: ${session.productId}, skipping session ${session.sessionId}`);
          continue;
        }

        // Fetch user details
        const user = await UserModel.findById(session.userId);

        if (!user) {
          console.warn(`[AbandonedSignupsJob] User not found: ${session.userId}, skipping session ${session.sessionId}`);
          continue;
        }

        // Generate resume link
        const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resumeLink = session.resumeToken
          ? `${frontendUrl}/products/${product._id}/signup/resume/${session.resumeToken}`
          : `${frontendUrl}/products/${product._id}/signup?session=${session.sessionId}`;

        // Send reminder email
        const emailSent = await sendSignupReminderEmail(
          user.email,
          user.firstName || user.email.split('@')[0],
          product.name,
          resumeLink,
          session.expiresAt,
          session.sessionId
        );

        if (emailSent) {
          // Mark as reminded
          await ProductSignupSessionModel.findByIdAndUpdate(session._id, {
            $set: {
              'metadata.reminderSent': true,
              'metadata.reminderSentAt': now
            }
          });

          emailsSent++;
          console.log(`[AbandonedSignupsJob] ✓ Reminder sent for session ${session.sessionId} (${user.email})`);
        } else {
          emailsFailed++;
          console.error(`[AbandonedSignupsJob] ✗ Failed to send reminder for session ${session.sessionId}`);
        }
      } catch (sessionError: any) {
        emailsFailed++;
        console.error(`[AbandonedSignupsJob] Error processing session ${session.sessionId}:`, sessionError.message);
      }
    }

    console.log('[AbandonedSignupsJob] Summary:', {
      sessionsFound: abandonedSessions.length,
      emailsSent,
      emailsFailed
    });
  } catch (error: any) {
    console.error('[AbandonedSignupsJob] Job failed:', error);
    throw error;
  }
};

// Job configuration for the scheduler
export const checkAbandonedSignupsJob = {
  name: 'checkAbandonedSignups',
  schedule: '*/5 * * * *', // Every 5 minutes
  task: checkAbandonedSignupsTask,
  enabled: true
};
