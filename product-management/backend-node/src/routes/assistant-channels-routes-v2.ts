import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AssistantChannelModel } from '../models/AssistantChannel';
import ProductModel from '../models/Product';
import { authenticateSession } from '../middleware/auth';
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
async function loadPromptTemplate(templateId: mongoose.Types.ObjectId | string | null, productCategory?: string) {
    console.log('[Load Template] templateId:', templateId, 'category:', productCategory);

    const PromptTemplate = mongoose.connection.collection('prompt_templates');

    if (templateId) {
        const objectId = mongoose.Types.ObjectId.isValid(templateId) 
            ? new mongoose.Types.ObjectId(templateId) 
            : templateId;
        const template = await PromptTemplate.findOne({ _id: objectId });
        if (template) {
            console.log('[Load Template] Found template by ID:', template.name);
            return template;
        }
    }

    // Fallback to category-based template
    if (productCategory) {
        const template = await PromptTemplate.findOne({
            productCategory: productCategory,
            isDefault: true
        });

        if (template) {
            console.log('[Load Template] Found category template:', template.name);
            return template;
        }
    }

    // Final fallback to any default template
    const template = await PromptTemplate.findOne({
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
    authenticateSession,
    requireVirtualAssistantSubscription,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            const tenantId = user.tenantId;

            if (!tenantId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Get all channels for this tenant
            const channels = await AssistantChannelModel.find({ tenantId }).lean();

            // Get product details for each channel
            const productIds = channels.map(ch =>
                mongoose.Types.ObjectId.isValid(ch.productId?.toString() || '') && ch.productId?.toString().length === 24
                    ? new mongoose.Types.ObjectId(ch.productId.toString())
                    : ch.productId
            ).filter(Boolean);

            const products = await ProductModel.find({
                _id: { $in: productIds }
            }).lean();

            // Enrich channels with product info
            const enrichedChannels = channels.map(channel => {
                const product = products.find((p: any) => p._id.toString() === channel.productId?.toString());
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
    authenticateSession,
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

            // Convert productId to ObjectId if valid
            const productObjectId = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24
                ? new mongoose.Types.ObjectId(productId)
                : productId;

            // Get product details first (needed for both existing and new channels)
            const product = await ProductModel.findById(productObjectId).lean();

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            let channel = await AssistantChannelModel.findOne({
                tenantId,
                productId: productObjectId
            }).lean();

            console.log('[Assistant Channels] Do we have a channel:', !!channel);
            
            // If no configuration exists, create default with product template
            if (!channel) {
                console.log('[Assistant Channels] Creating new channel for product:', product.name);
                
                let templateId = null;
                if ((product as any)?.defaultPromptTemplateId) {
                    templateId = (product as any).defaultPromptTemplateId;
                }

                // Load the template data
                const template = await loadPromptTemplate(templateId, (product as any)?.category);

                console.log('[Assistant Channels] Creating default channel with template:', {
                    found: !!template,
                    name: template?.name,
                    hasPromptContext: !!template?.promptContext,
                    hasCustomPrompts: !!template?.customPrompts,
                    hasRagConfig: !!template?.ragConfig
                });

                const defaultChannel = {
                    tenantId,
                    customerId: tenantId,
                    productId: productObjectId,
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
                    whatsapp: defaultWhatsAppConfig
                };

                const newChannel = await AssistantChannelModel.create(defaultChannel);
                channel = newChannel.toObject();
            }

            const reponse = {
                ...channel,
                product: product ? {
                    _id: product._id,
                    name: product.name,
                    category: product.category,
                    description: product.description
                } : null
            };

            return res.json(reponse);

        } catch (error) {
            console.error('[Assistant Channels] Get by product error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// PATCH /assistant-channels/:productId
// Update assistant channel configuration for specific product (admin only)
router.patch('/:productId',
    authenticateSession,
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

            const productObjectId = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24
                ? new mongoose.Types.ObjectId(productId)
                : productId;

            // Build update object
            const updateDoc: any = {
                tenantId: tenantId,
                customerId: tenantId,
                productId: productObjectId,
                updatedAt: new Date()
            };

            if (updates.voice) {
                updateDoc.voice = updates.voice;
            }
            if (updates.chat) {
                updateDoc.chat = updates.chat;
            }
            if (updates.sms) {
                updateDoc.sms = updates.sms;
            }
            if (updates.whatsapp) {
                updateDoc.whatsapp = updates.whatsapp;
            }

            const result = await AssistantChannelModel.findOneAndUpdate(
                {
                    tenantId,
                    productId: productObjectId
                },
                { $set: updateDoc },
                {
                    upsert: true,
                    new: true
                }
            ).lean();

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
    authenticateSession,
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

            const productObjectId = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24
                ? new mongoose.Types.ObjectId(productId)
                : productId;

            const result = await AssistantChannelModel.findOneAndUpdate(
                {
                    tenantId,
                    productId: productObjectId
                },
                {
                    $set: {
                        voice: voiceConfig,
                        updatedAt: new Date()
                    }
                },
                {
                    upsert: true,
                    new: true
                }
            ).lean();

            return res.json(result);

        } catch (error) {
            console.error('[Assistant Channels] Voice update error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// PATCH /assistant-channels/:productId/chat
// Update chat channel configuration only (admin only)
router.patch('/:productId/chat',
    authenticateSession,
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

            const productObjectId = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24
                ? new mongoose.Types.ObjectId(productId)
                : productId;

            const result = await AssistantChannelModel.findOneAndUpdate(
                {
                    tenantId,
                    productId: productObjectId
                },
                {
                    $set: {
                        chat: chatConfig,
                        updatedAt: new Date()
                    }
                },
                {
                    upsert: true,
                    new: true
                }
            ).lean();

            return res.json(result);

        } catch (error) {
            console.error('[Assistant Channels] Chat update error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

// POST /assistant-channels/:productId/voice/toggle
// Toggle voice channel on/off (admin only)
router.post('/:productId/voice/toggle',
    authenticateSession,
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

            const productObjectId = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24
                ? new mongoose.Types.ObjectId(productId)
                : productId;

            const result = await AssistantChannelModel.findOneAndUpdate(
                {
                    tenantId,
                    productId: productObjectId
                },
                {
                    $set: {
                        'voice.enabled': enabled,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            ).lean();

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
    authenticateSession,
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

            const productObjectId = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24
                ? new mongoose.Types.ObjectId(productId)
                : productId;

            const result = await AssistantChannelModel.findOneAndUpdate(
                {
                    tenantId,
                    productId: productObjectId
                },
                {
                    $set: {
                        'chat.enabled': enabled,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            ).lean();

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

        const channel = await AssistantChannelModel.findOne({
            'voice.phoneNumber': phoneNumber,
            'voice.enabled': true
        }).lean();

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
