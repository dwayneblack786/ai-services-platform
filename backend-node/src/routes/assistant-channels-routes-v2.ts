import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import {
    requireTenantAdmin,
    requireVirtualAssistantSubscription,
    requireProductAccess
} from '../middleware/authorization';
import {
    AssistantChannel,
    defaultVoiceConfig,
    defaultChatConfig,
    defaultSmsConfig,
    defaultWhatsAppConfig
} from '../types/assistant-channels.types';

const router = express.Router();

/**
 * Load prompt template from prompt_templates collection
 * Used to populate default configuration for new channels
 */
async function loadPromptTemplate(db: any, templateId: ObjectId | null, productCategory?: string) {
    console.log('[Load Template] templateId:', templateId, 'category:', productCategory);

    if (templateId) {
        const template = await db.collection('prompt_templates').findOne({ _id: templateId });
        if (template) {
            console.log('[Load Template] Found template by ID:', template.name);
            return template;
        }
    }

    // Fallback to category-based template
    if (productCategory) {
        const template = await db.collection('prompt_templates').findOne({
            productCategory: productCategory,
            isDefault: true
        });

        if (template) {
            console.log('[Load Template] Found category template:', template.name);
            return template;
        }
    }

    // Final fallback to any default template
    const template = await db.collection('prompt_templates').findOne({
        isDefault: true
    });

    if (template) {
        console.log('[Load Template] Found default template:', template.name);
    } else {
        console.log('[Load Template] No template found!');
    }

    return template;
}

// GET /assistant-channels
// Get all assistant channel configurations for tenant (grouped by product)
router.get('/',
    authenticateToken,
    requireVirtualAssistantSubscription,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const db = getDB();

            // Get all channels for this tenant
            const channels = await db.collection<AssistantChannel>('assistant_channels')
                .find({ tenantId })
                .toArray();

            // Get product details for each channel
            const productIds = channels.map(ch =>
                typeof ch.productId === 'string' ? new ObjectId(ch.productId) : ch.productId
            ).filter(Boolean);

            const products = await db.collection('products').find({
                _id: { $in: productIds }
            }).toArray();

            // Enrich channels with product info
            const enrichedChannels = channels.map(channel => {
                const product = products.find(p => p._id.toString() === channel.productId?.toString());
                return {
                    ...channel,
                    product: product ? {
                        _id: product._id,
                        name: product.name,
                        category: product.category
                    } : null
                };
            });

            return res.json({
                channels: enrichedChannels,
                count: enrichedChannels.length
            });

        } catch (error) {
            console.error('[Assistant Channels] Get error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// GET /assistant-channels/:productId
// Get assistant channel configuration for specific product
router.get('/:productId',
    authenticateToken,
    requireVirtualAssistantSubscription,
    requireProductAccess,
    async (req: Request, res: Response) => {


        console.log('[Assistant Channels] GET /:productId called with params:', req.params);
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;
            const { productId } = req.params;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const db = getDB();

            // Get product details first (needed for both existing and new channels)
            const product = await db.collection('products').findOne({
                _id: new ObjectId(productId)
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            let channel = await db.collection<AssistantChannel>('assistant_channels')
                .findOne({
                    tenantId,
                    productId: new ObjectId(productId)
                });

            console.log('[Assistant Channels] Do we have a channel:', !!channel);
            
            // If no configuration exists, create default with product template
            if (!channel) {
                console.log('[Assistant Channels] Creating new channel for product:', product.name);
                
                let templateId = null;
                if (product?.defaultPromptTemplateId) {
                    templateId = product.defaultPromptTemplateId;
                }

                // Load the template data
                const template = await loadPromptTemplate(db, templateId, product?.category);

                console.log('[Assistant Channels] Creating default channel with template:', {
                    found: !!template,
                    name: template?.name,
                    hasPromptContext: !!template?.promptContext,
                    hasCustomPrompts: !!template?.customPrompts,
                    hasRagConfig: !!template?.ragConfig
                });

                const defaultChannel: AssistantChannel = {
                    tenantId,
                    customerId: tenantId, // For backward compatibility
                    productId: new ObjectId(productId),
                    voice: {
                        ...defaultVoiceConfig,
                        promptContext: template?.promptContext,
                        customPrompts: template?.customPrompts,
                        ragConfig: template?.ragConfig,
                        promptTemplateId: template?._id?.toString()
                    },
                    chat: {
                        ...defaultChatConfig,
                        promptContext: template?.promptContext,
                        customPrompts: template?.customPrompts,
                        ragConfig: template?.ragConfig,
                        promptTemplateId: template?._id?.toString()
                    },
                    sms: defaultSmsConfig,
                    whatsapp: defaultWhatsAppConfig,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await db.collection<AssistantChannel>('assistant_channels')
                    .insertOne(defaultChannel);

                channel = { ...defaultChannel, _id: result.insertedId };
            }

            const reponse = {
                ...channel,
                product: product ? {
                    _id: product._id,
                    name: product.name,
                    category: product.category,
                    description: product.description
                } : null
            }

            return res.json(reponse);

        } catch (error) {
            console.error('[Assistant Channels] Get by product error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// PATCH /assistant-channels/:productId
// Update assistant channel configuration for specific product (admin only)
router.patch('/:productId',
    authenticateToken,
    requireTenantAdmin,
    requireVirtualAssistantSubscription,
    requireProductAccess,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;
            const { productId } = req.params;
            const updates = req.body;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const db = getDB();

            // Build update object
            const updateDoc: any = {
                $set: {
                    updatedAt: new Date(),
                    tenantId: tenantId,
                    customerId: tenantId,
                    productId: new ObjectId(productId)
                }
            };

            if (updates.voice) {
                updateDoc.$set.voice = updates.voice;
            }
            if (updates.chat) {
                updateDoc.$set.chat = updates.chat;
            }
            if (updates.sms) {
                updateDoc.$set.sms = updates.sms;
            }
            if (updates.whatsapp) {
                updateDoc.$set.whatsapp = updates.whatsapp;
            }

            const result = await db.collection<AssistantChannel>('assistant_channels')
                .findOneAndUpdate(
                    {
                        tenantId,
                        productId: new ObjectId(productId)
                    },
                    updateDoc,
                    {
                        upsert: true,
                        returnDocument: 'after'
                    }
                );

            console.log('[Assistant Channels] Update result:', result);
            return res.json(result);

        } catch (error) {
            console.error('[Assistant Channels] Update error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// PATCH /assistant-channels/:productId/voice
// Update voice channel configuration only (admin only)
router.patch('/:productId/voice',
    authenticateToken,
    requireTenantAdmin,
    requireVirtualAssistantSubscription,
    requireProductAccess,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;
            const { productId } = req.params;
            const voiceConfig = req.body;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const db = getDB();

            const result = await db.collection<AssistantChannel>('assistant_channels')
                .findOneAndUpdate(
                    {
                        tenantId,
                        productId: new ObjectId(productId)
                    },
                    {
                        $set: {
                            voice: voiceConfig,
                            updatedAt: new Date()
                        }
                    },
                    {
                        upsert: true,
                        returnDocument: 'after'
                    }
                );

            return res.json(result);

        } catch (error) {
            console.error('[Assistant Channels] Voice update error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// PATCH /assistant-channels/:productId/chat
// Update chat channel configuration only (admin only)
router.patch('/:productId/chat',
    authenticateToken,
    requireTenantAdmin,
    requireVirtualAssistantSubscription,
    requireProductAccess,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;
            const { productId } = req.params;
            const chatConfig = req.body;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const db = getDB();

            const result = await db.collection<AssistantChannel>('assistant_channels')
                .findOneAndUpdate(
                    {
                        tenantId,
                        productId: new ObjectId(productId)
                    },
                    {
                        $set: {
                            chat: chatConfig,
                            updatedAt: new Date()
                        }
                    },
                    {
                        upsert: true,
                        returnDocument: 'after'
                    }
                );

            return res.json(result);

        } catch (error) {
            console.error('[Assistant Channels] Chat update error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// POST /assistant-channels/:productId/voice/toggle
// Toggle voice channel on/off (admin only)
router.post('/:productId/voice/toggle',
    authenticateToken,
    requireTenantAdmin,
    requireVirtualAssistantSubscription,
    requireProductAccess,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;
            const { productId } = req.params;
            const { enabled } = req.body;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const db = getDB();

            const result = await db.collection<AssistantChannel>('assistant_channels')
                .findOneAndUpdate(
                    {
                        tenantId,
                        productId: new ObjectId(productId)
                    },
                    {
                        $set: {
                            'voice.enabled': enabled,
                            updatedAt: new Date()
                        }
                    },
                    { returnDocument: 'after' }
                );

            if (!result) {
                return res.status(404).json({ error: 'Assistant channels not found' });
            }

            return res.json({
                success: true,
                enabled,
                message: `Voice channel ${enabled ? 'enabled' : 'disabled'}`
            });

        } catch (error) {
            console.error('[Assistant Channels] Voice toggle error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// POST /assistant-channels/:productId/chat/toggle
// Toggle chat channel on/off (admin only)
router.post('/:productId/chat/toggle',
    authenticateToken,
    requireTenantAdmin,
    requireVirtualAssistantSubscription,
    requireProductAccess,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;
            const { productId } = req.params;
            const { enabled } = req.body;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const db = getDB();

            const result = await db.collection<AssistantChannel>('assistant_channels')
                .findOneAndUpdate(
                    {
                        tenantId,
                        productId: new ObjectId(productId)
                    },
                    {
                        $set: {
                            'chat.enabled': enabled,
                            updatedAt: new Date()
                        }
                    },
                    { returnDocument: 'after' }
                );

            if (!result) {
                return res.status(404).json({ error: 'Assistant channels not found' });
            }

            return res.json({
                success: true,
                enabled,
                message: `Chat channel ${enabled ? 'enabled' : 'disabled'}`
            });

        } catch (error) {
            console.error('[Assistant Channels] Chat toggle error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// GET /assistant-channels/by-phone/:phoneNumber
// Get channel configuration by phone number (for voice incoming calls)
// This endpoint doesn't require authentication as it's called by telephony system
router.get('/by-phone/:phoneNumber', async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.params;

        const db = getDB();

        const channel = await db.collection<AssistantChannel>('assistant_channels')
            .findOne({
                'voice.phoneNumber': phoneNumber,
                'voice.enabled': true
            });

        if (!channel) {
            return res.status(404).json({ error: 'Voice channel not found or not enabled' });
        }

        return res.json(channel);

    } catch (error) {
        console.error('[Assistant Channels] Get by phone error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
