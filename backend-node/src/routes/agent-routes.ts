/**
 * Agent Routes - Spring AI Agentic Workflow Endpoints
 * Handles complex multi-step tasks via Java Spring AI agent
 * Uses unified AssistantService for consistent handling
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';
import { assistantService } from '../services/assistant-service';

const router = express.Router();

/**
 * POST /agent/execute
 * Execute the AI agent with user message
 * Uses unified AssistantService for consistent processing
 * 
 * Body:
 *   - message: string (required) - User's message
 *   - sessionId: string (optional) - Conversation session ID
 *   - context: object (optional) - Additional context
 */
router.post('/execute', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { sessionId, message, context } = req.body;
        
        // Validate inputs
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Message is required and must be a string' 
            });
        }

        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const user = req.user;
        
        // Use user ID as session if not provided
        const effectiveSessionId = sessionId || `user-${user.id}`;
        
        // Process through unified assistant service
        const response = await assistantService.processMessage({
            sessionId: effectiveSessionId,
            message: message.trim(),
            userId: user.id,
            userEmail: user.email,
            tenantId: user.tenantId,
            source: 'text',
            context: {
                productId: context?.productId || 'va-service',
                userRole: user.role,
                userName: user.name,
                ...context
            }
        });
        
        // Log processing metrics
        console.log(`[Agent REST] Session: ${effectiveSessionId.substring(0, 8)}..., ` +
                   `Time: ${response.metadata?.processingTime}ms, ` +
                   `Source: ${response.metadata?.source}`);
        
        res.json(response);
    } catch (error: any) {
        console.error('[Agent REST] Execution failed:', error);
        
        // Return error with appropriate status code
        res.status(error.statusCode || 500).json({ 
            error: error.message || 'Agent execution failed',
            sessionId: error.sessionId
        });
    }
});

/**
 * DELETE /agent/session/:sessionId
 * Clear conversation history for a session
 */
router.delete('/session/:sessionId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        
        await assistantService.endSession(sessionId);
        
        console.log(`[Agent] Cleared session: ${sessionId}`);
        res.json({ message: 'Session cleared successfully' });
    } catch (error) {
        console.error('[Agent] Failed to clear session:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

/**
 * GET /agent/health
 * Check agent service health
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        const isHealthy = await assistantService.healthCheck();
        if (isHealthy) {
            res.json({ status: 'healthy' });
        } else {
            res.status(503).json({ status: 'unhealthy', error: 'Agent service unavailable' });
        }
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy',
            error: 'Agent service unavailable'
        });
    }
});

export default router;
