/**
 * Prompt Editor - 6-Layer Form with Multi-Channel & Tenant Isolation
 *
 * Features:
 * - 6-layer prompt content structure
 * - Channel selector (voice/chat/sms/whatsapp/email)
 * - Tenant/Product isolation
 * - Auto-save (30-second debounce)
 * - Real-time validation
 * - Version tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import promptApi, { IPromptVersion } from '../services/promptApi';
import apiClient from '../services/apiClient';
import styled from '@emotion/styled';
import PromptPreview from '../components/PromptPreview';
import TestResultsViewer from '../components/TestResultsViewer';
import RAGSourceManager from '../components/RAGSourceManager';
import { useAuth } from '../context/AuthContext';

// Styled Components
const EditorContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;

  ${props => props.variant === 'primary' && `
    background: #1976d2;
    color: white;
    &:hover { background: #1565c0; }
  `}

  ${props => props.variant === 'secondary' && `
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    &:hover { background: #e0e0e0; }
  `}

  ${props => props.variant === 'danger' && `
    background: #d32f2f;
    color: white;
    &:hover { background: #c62828; }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;

  ${props => {
    switch (props.status) {
      case 'draft': return 'background: #fff3e0; color: #e65100;';
      case 'testing': return 'background: #e3f2fd; color: #0277bd;';
      case 'staging': return 'background: #f3e5f5; color: #6a1b9a;';
      case 'production': return 'background: #e8f5e9; color: #2e7d32;';
      case 'archived': return 'background: #f5f5f5; color: #757575;';
      default: return 'background: #f5f5f5; color: #757575;';
    }
  }}
`;

const SaveIndicator = styled.div<{ saving: boolean }>`
  font-size: 14px;
  color: ${props => props.saving ? '#1976d2' : '#4caf50'};
  font-style: italic;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
`;

const ReadOnlyLabel = styled.div`
  font-size: 14px;
  color: #666;
  padding: 10px 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
`;

const MetadataSection = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const LayerSection = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const LayerHeader = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LayerNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1976d2;
  color: white;
  font-size: 16px;
  font-weight: 700;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const ArrayInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ArrayItem = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const RemoveButton = styled.button`
  padding: 6px 12px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    background: #d32f2f;
  }
`;

const AddButton = styled.button`
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 8px;

  &:hover {
    background: #45a049;
  }
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
`;

interface PromptEditorProps {}

const PromptEditor: React.FC<PromptEditorProps> = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasAnyRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<IPromptVersion | null>(null);
  const [activeTab, setActiveTab] = useState<'configuration' | 'preview' | 'analysis'>('configuration');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showVersionWarning, setShowVersionWarning] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<'testing' | 'production'>('testing');
  const savedPromptRef = useRef<IPromptVersion | null>(null); // snapshot of last persisted state
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEditingNonDraft, setIsEditingNonDraft] = useState(false);

  const isAdmin = hasAnyRole('ADMIN', 'PROJECT_ADMIN');
  const isEditMode = !!id;

  // Initialize empty prompt structure
  const emptyPrompt: Partial<IPromptVersion> = {
    name: '',
    description: '',
    category: '',
    channelType: 'voice',
    tenantId: '',
    productId: '',
    state: 'draft',
    environment: 'development',
    content: {
      systemPrompt: '',
      persona: {
        tone: '',
        personality: '',
        allowedActions: [],
        disallowedActions: []
      },
      businessContext: {
        servicesOffered: [],
        pricingInfo: '',
        locations: [],
        policies: '',
        faqs: []
      },
      ragConfig: {
        enabled: false
      },
      conversationBehavior: {
        greeting: '',
        fallbackMessage: '',
        intentPrompts: {},
        askForNameFirst: false,
        conversationMemoryTurns: 10
      },
      constraints: {
        prohibitedTopics: [],
        complianceRules: [],
        requireConsent: false,
        maxConversationTurns: 50
      },
      customVariables: {}
    }
  };

  // Load prompt if editing existing, or pre-fill from URL params (including template mode)
  useEffect(() => {
    const loadPrompt = async () => {
      if (id) {
        // Edit mode: Load existing prompt
        try {
          setLoading(true);
          const data = await promptApi.getPrompt(id);
          setPrompt(data);
          savedPromptRef.current = JSON.parse(JSON.stringify(data));

          // Check if editing a non-draft prompt
          if (data.state !== 'draft') {
            setIsEditingNonDraft(true);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load prompt');
        } finally {
          setLoading(false);
        }
      } else {
        // Create mode: Check if creating from template
        const templateId = searchParams.get('templateId');

        if (templateId) {
          // Template mode: Load template and pre-fill all 6 layers
          try {
            setLoading(true);
            const templateResponse = await apiClient.get(`/api/pms/prompts/templates/${templateId}`);
            const template = templateResponse.data;

            // Clone template content and apply tenant/product info
            const newPrompt = {
              ...emptyPrompt,
              name: template.name.replace(' Template', ''), // Remove "Template" from name
              description: `Created from ${template.name}`,
              category: template.category,
              channelType: template.channelType,
              productId: searchParams.get('productId') || template.productId,
              tenantId: searchParams.get('tenantId') || '',
              content: JSON.parse(JSON.stringify(template.content)), // Deep clone
              baseTemplateId: template._id // Link back to template
            } as IPromptVersion;

            setPrompt(newPrompt);
          } catch (err: any) {
            console.error('Error loading template:', err);
            setError(err.response?.data?.error || 'Failed to load template');
          } finally {
            setLoading(false);
          }
        } else {
          // Standard create mode: Pre-fill from URL parameters
          const newPrompt = { ...emptyPrompt } as IPromptVersion;

          const channelType = searchParams.get('channelType');
          const productId = searchParams.get('productId');
          const tenantId = searchParams.get('tenantId');

          if (channelType) {
            newPrompt.channelType = channelType as any;
          }
          if (productId) {
            newPrompt.productId = productId;
          }
          if (tenantId) {
            newPrompt.tenantId = tenantId;
          }

          setPrompt(newPrompt);
          setLoading(false);
        }
      }
    };

    loadPrompt();
  }, [id, searchParams]);

  // Auto-save with 30-second debounce - only for existing drafts
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(async () => {
      // Only auto-save existing drafts
      if (prompt && prompt._id && prompt.state === 'draft' && !isEditingNonDraft) {
        try {
          setSaving(true);
          const result = await promptApi.updateDraft(prompt._id, prompt);
          console.log('Auto-saved at', new Date().toLocaleTimeString());
          // Update saved reference
          savedPromptRef.current = JSON.parse(JSON.stringify(result.prompt));
        } catch (err: any) {
          console.error('Auto-save failed:', err);
        } finally {
          setSaving(false);
        }
      }
    }, 30000); // 30 seconds
  }, [prompt, isEditingNonDraft]);

  // Update field helper
  const updateField = (path: string, value: any) => {
    if (!prompt) return;

    const keys = path.split('.');
    const updated = { ...prompt };
    let current: any = updated;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setPrompt(updated);
    triggerAutoSave();
  };

  // Dirty check: compare current prompt to last saved snapshot
  const isDirty = () => {
    if (!prompt || !savedPromptRef.current) return !!prompt;
    return JSON.stringify(prompt) !== JSON.stringify(savedPromptRef.current);
  };

  // Handle Save button click
  const handleSaveClick = () => {
    if (!prompt) return;

    if (!prompt._id) {
      // New prompt — create directly
      handleCreate();
    } else if (isEditingNonDraft) {
      // First save of a non-draft prompt - show version warning
      setShowVersionWarning(true);
    } else {
      // Existing draft - just update
      handleUpdateDraft();
    }
  };

  // Create a brand new draft
  const handleCreate = async () => {
    if (!prompt) return;
    try {
      setSaving(true);
      const created = await promptApi.createDraft({
        name: prompt.name,
        description: prompt.description,
        category: prompt.category,
        channelType: prompt.channelType,
        tenantId: prompt.tenantId,
        productId: prompt.productId,
        content: prompt.content
      });
      setPrompt(created);
      savedPromptRef.current = JSON.parse(JSON.stringify(created));
    } catch (err: any) {
      setError(err.message || 'Failed to create prompt');
    } finally {
      setSaving(false);
    }
  };

  // Update existing draft
  const handleUpdateDraft = async () => {
    if (!prompt || !prompt._id) return;
    try {
      setSaving(true);
      const result = await promptApi.updateDraft(prompt._id, prompt);

      if (result.isNewVersion) {
        // A new version was created (first save of non-draft)
        setPrompt(result.prompt);
        savedPromptRef.current = JSON.parse(JSON.stringify(result.prompt));
        setIsEditingNonDraft(false); // Now editing the new draft
      } else {
        // Just updated the existing draft
        setPrompt(result.prompt);
        savedPromptRef.current = JSON.parse(JSON.stringify(result.prompt));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update draft');
    } finally {
      setSaving(false);
    }
  };

  // Confirmed version creation from warning modal
  const handleVersionWarningConfirm = async () => {
    setShowVersionWarning(false);
    await handleUpdateDraft();
  };

  // Handle promotion to testing or production
  const handlePromote = async (targetState: 'testing' | 'production') => {
    if (!prompt || !prompt._id) return;
    setShowPromoteModal(false);

    try {
      setSaving(true);
      const promoted = await promptApi.promotePrompt(prompt._id, targetState);
      setPrompt(promoted);
      savedPromptRef.current = JSON.parse(JSON.stringify(promoted));

      // Navigate back to list after promotion
      setTimeout(() => navigate('/prompts'), 1000);
    } catch (err: any) {
      setError(err.message || `Failed to promote to ${targetState}`);
    } finally {
      setSaving(false);
    }
  };

  // Determine return path based on context
  const getReturnPath = () => {
    // Check for explicit returnTo param
    const returnTo = searchParams.get('returnTo');
    if (returnTo) return returnTo;

    // Check for productId param (indicates tenant prompts page)
    const productId = searchParams.get('productId');
    if (productId) {
      return `/tenant-prompts?productId=${productId}`;
    }

    // Check if prompt has tenantId (tenant-specific prompt)
    if (prompt?.tenantId && prompt?.productId) {
      return `/tenant-prompts?productId=${prompt.productId}`;
    }

    // Default to prompt management page
    return '/prompts';
  };

  // Cancel / Discard — if dirty show confirmation modal, else navigate back
  const handleCancelClick = () => {
    if (isDirty()) {
      setShowCancelModal(true);
    } else {
      navigate(getReturnPath());
    }
  };

  // Confirmed discard — reload from last saved
  const handleDiscardConfirmed = async () => {
    setShowCancelModal(false);
    if (savedPromptRef.current) {
      setPrompt(JSON.parse(JSON.stringify(savedPromptRef.current)));
    } else {
      navigate(getReturnPath());
    }
  };

  if (loading) {
    return <EditorContainer>Loading...</EditorContainer>;
  }

  if (!prompt) {
    return <EditorContainer>Prompt not found</EditorContainer>;
  }

  // Extract form content to avoid duplication
  const formContent = (
    <>
      {/* Metadata Section */}
      <MetadataSection>
        <FormGroup>
          <Label>Prompt Name *</Label>
          <Input
            type="text"
            value={prompt.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Healthcare Voice Assistant v3"
          />
        </FormGroup>

        <FormGroup>
          <Label>Description</Label>
          <Textarea
            value={prompt.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe the purpose of this prompt..."
            rows={3}
          />
        </FormGroup>

        <FormGroup>
          <Label>Channel Type *</Label>
          {isEditMode ? (
            <ReadOnlyLabel>
              {prompt.channelType === 'voice' ? '📞 Voice' :
               prompt.channelType === 'chat' ? '💬 Chat' :
               prompt.channelType === 'sms' ? '📱 SMS' :
               prompt.channelType === 'whatsapp' ? '📲 WhatsApp' :
               prompt.channelType === 'email' ? '📧 Email' :
               prompt.channelType}
            </ReadOnlyLabel>
          ) : (
            <Select
              value={prompt.channelType}
              onChange={(e) => updateField('channelType', e.target.value)}
            >
              <option value="voice">Voice</option>
              <option value="chat">Chat</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </Select>
          )}
        </FormGroup>

        <FormGroup>
          <Label>Category</Label>
          {isEditMode ? (
            <ReadOnlyLabel>{prompt.category || 'Not set'}</ReadOnlyLabel>
          ) : (
            <Input
              type="text"
              value={prompt.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="e.g., Virtual Assistant, IDP, Computer Vision"
            />
          )}
          {isEditMode && (
            <span style={{ fontSize: '12px', color: '#999', marginTop: '4px', display: 'block' }}>
              Category is set by the product and cannot be changed.
            </span>
          )}
        </FormGroup>

        <FormGroup>
          <Label>Tenant</Label>
          {isEditMode ? (
            <ReadOnlyLabel>{prompt.tenantId || 'Platform Template'}</ReadOnlyLabel>
          ) : (
            <Input
              type="text"
              value={prompt.tenantId || ''}
              onChange={(e) => updateField('tenantId', e.target.value)}
              placeholder="Leave empty for platform-wide template"
            />
          )}
        </FormGroup>

        <FormGroup>
          <Label>Product</Label>
          {isEditMode ? (
            <ReadOnlyLabel>{prompt.productId || '—'}</ReadOnlyLabel>
          ) : (
            <Input
              type="text"
              value={prompt.productId || ''}
              onChange={(e) => updateField('productId', e.target.value)}
              placeholder="Product identifier"
            />
          )}
        </FormGroup>
      </MetadataSection>

      {/* Layer 1: System Prompt */}
      <LayerSection>
        <LayerHeader>
          <LayerNumber>1</LayerNumber>
          System Prompt
        </LayerHeader>
        <FormGroup>
          <Label>System Instructions *</Label>
          <Textarea
            value={prompt.content.systemPrompt}
            onChange={(e) => updateField('content.systemPrompt', e.target.value)}
            placeholder="You are a helpful assistant that..."
            rows={6}
            readOnly={isEditMode && !isAdmin}
            style={isEditMode && !isAdmin ? { background: '#f9f9f9', cursor: 'not-allowed' } : {}}
          />
          {isEditMode && !isAdmin && (
            <span style={{ fontSize: '12px', color: '#999', marginTop: '4px', display: 'block' }}>
              System Prompt can only be edited by Project Admins or Admins.
            </span>
          )}
        </FormGroup>
      </LayerSection>

      {/* Layer 2: Persona */}
      <LayerSection>
        <LayerHeader>
          <LayerNumber>2</LayerNumber>
          Persona
        </LayerHeader>
        <FormGroup>
          <Label>Tone *</Label>
          <Input
            type="text"
            value={prompt.content.persona.tone}
            onChange={(e) => updateField('content.persona.tone', e.target.value)}
            placeholder="e.g., professional, friendly, empathetic"
          />
        </FormGroup>

        <FormGroup>
          <Label>Personality *</Label>
          <Textarea
            value={prompt.content.persona.personality}
            onChange={(e) => updateField('content.persona.personality', e.target.value)}
            placeholder="Describe the assistant's personality..."
            rows={3}
          />
        </FormGroup>

        <FormGroup>
          <Label>Allowed Actions</Label>
          <ArrayInput>
            {prompt.content.persona.allowedActions.map((action, index) => (
              <ArrayItem key={index}>
                <Input
                  type="text"
                  value={action}
                  onChange={(e) => {
                    const updated = [...prompt.content.persona.allowedActions];
                    updated[index] = e.target.value;
                    updateField('content.persona.allowedActions', updated);
                  }}
                  placeholder="e.g., schedule_appointment"
                />
                <RemoveButton
                  onClick={() => {
                    const updated = prompt.content.persona.allowedActions.filter((_, i) => i !== index);
                    updateField('content.persona.allowedActions', updated);
                  }}
                >
                  Remove
                </RemoveButton>
              </ArrayItem>
            ))}
            <AddButton
              onClick={() => {
                const updated = [...prompt.content.persona.allowedActions, ''];
                updateField('content.persona.allowedActions', updated);
              }}
            >
              + Add Allowed Action
            </AddButton>
          </ArrayInput>
        </FormGroup>

        <FormGroup>
          <Label>Disallowed Actions</Label>
          <ArrayInput>
            {prompt.content.persona.disallowedActions.map((action, index) => (
              <ArrayItem key={index}>
                <Input
                  type="text"
                  value={action}
                  onChange={(e) => {
                    const updated = [...prompt.content.persona.disallowedActions];
                    updated[index] = e.target.value;
                    updateField('content.persona.disallowedActions', updated);
                  }}
                  placeholder="e.g., diagnose, prescribe"
                />
                <RemoveButton
                  onClick={() => {
                    const updated = prompt.content.persona.disallowedActions.filter((_, i) => i !== index);
                    updateField('content.persona.disallowedActions', updated);
                  }}
                >
                  Remove
                </RemoveButton>
              </ArrayItem>
            ))}
            <AddButton
              onClick={() => {
                const updated = [...prompt.content.persona.disallowedActions, ''];
                updateField('content.persona.disallowedActions', updated);
              }}
            >
              + Add Disallowed Action
            </AddButton>
          </ArrayInput>
        </FormGroup>
      </LayerSection>

      {/* Layer 3: Business Context */}
      <LayerSection>
        <LayerHeader>
          <LayerNumber>3</LayerNumber>
          Business Context
        </LayerHeader>
        <FormGroup>
          <Label>Services Offered</Label>
          <ArrayInput>
            {prompt.content.businessContext.servicesOffered.map((service, index) => (
              <ArrayItem key={index}>
                <Input
                  type="text"
                  value={service}
                  onChange={(e) => {
                    const updated = [...prompt.content.businessContext.servicesOffered];
                    updated[index] = e.target.value;
                    updateField('content.businessContext.servicesOffered', updated);
                  }}
                  placeholder="e.g., Primary Care"
                />
                <RemoveButton
                  onClick={() => {
                    const updated = prompt.content.businessContext.servicesOffered.filter((_, i) => i !== index);
                    updateField('content.businessContext.servicesOffered', updated);
                  }}
                >
                  Remove
                </RemoveButton>
              </ArrayItem>
            ))}
            <AddButton
              onClick={() => {
                const updated = [...prompt.content.businessContext.servicesOffered, ''];
                updateField('content.businessContext.servicesOffered', updated);
              }}
            >
              + Add Service
            </AddButton>
          </ArrayInput>
        </FormGroup>

        <FormGroup>
          <Label>Pricing Information</Label>
          <Textarea
            value={prompt.content.businessContext.pricingInfo || ''}
            onChange={(e) => updateField('content.businessContext.pricingInfo', e.target.value)}
            placeholder="Describe pricing, copays, insurance..."
            rows={3}
          />
        </FormGroup>

        <FormGroup>
          <Label>Policies</Label>
          <Textarea
            value={prompt.content.businessContext.policies || ''}
            onChange={(e) => updateField('content.businessContext.policies', e.target.value)}
            placeholder="Company policies, terms of service..."
            rows={4}
          />
        </FormGroup>
      </LayerSection>

      {/* Layer 4: RAG Configuration */}
      <LayerSection>
        <LayerHeader>
          <LayerNumber>4</LayerNumber>
          RAG Configuration
        </LayerHeader>
        {prompt._id ? (
          <RAGSourceManager promptVersionId={prompt._id} />
        ) : (
          <div style={{ fontSize: '14px', color: '#888', fontStyle: 'italic' }}>
            Save this prompt first to enable RAG knowledge-base configuration.
          </div>
        )}
      </LayerSection>

      {/* Layer 5: Conversation Behavior */}
      <LayerSection>
        <LayerHeader>
          <LayerNumber>5</LayerNumber>
          Conversation Behavior
        </LayerHeader>
        <FormGroup>
          <Label>Greeting Message *</Label>
          <Textarea
            value={prompt.content.conversationBehavior.greeting}
            onChange={(e) => updateField('content.conversationBehavior.greeting', e.target.value)}
            placeholder="Hello! How can I help you today?"
            rows={2}
          />
        </FormGroup>

        <FormGroup>
          <Label>Fallback Message</Label>
          <Textarea
            value={prompt.content.conversationBehavior.fallbackMessage || ''}
            onChange={(e) => updateField('content.conversationBehavior.fallbackMessage', e.target.value)}
            placeholder="I'm sorry, I didn't understand that..."
            rows={2}
          />
        </FormGroup>

        <FormGroup>
          <Label>Ask for Name First</Label>
          <input
            type="checkbox"
            checked={prompt.content.conversationBehavior.askForNameFirst}
            onChange={(e) => updateField('content.conversationBehavior.askForNameFirst', e.target.checked)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Conversation Memory Turns</Label>
          <Input
            type="number"
            value={prompt.content.conversationBehavior.conversationMemoryTurns}
            onChange={(e) => updateField('content.conversationBehavior.conversationMemoryTurns', parseInt(e.target.value))}
            min={1}
            max={100}
            readOnly={isEditMode && !isAdmin}
            style={isEditMode && !isAdmin ? { background: '#f9f9f9', cursor: 'not-allowed' } : {}}
          />
          {isEditMode && !isAdmin && (
            <span style={{ fontSize: '12px', color: '#999', marginTop: '4px', display: 'block' }}>
              Editable by Project Admins or Admins only.
            </span>
          )}
        </FormGroup>
      </LayerSection>

      {/* Layer 6: Constraints */}
      <LayerSection>
        <LayerHeader>
          <LayerNumber>6</LayerNumber>
          Constraints & Compliance
        </LayerHeader>
        <FormGroup>
          <Label>Prohibited Topics</Label>
          <ArrayInput>
            {prompt.content.constraints.prohibitedTopics.map((topic, index) => (
              <ArrayItem key={index}>
                <Input
                  type="text"
                  value={topic}
                  onChange={(e) => {
                    const updated = [...prompt.content.constraints.prohibitedTopics];
                    updated[index] = e.target.value;
                    updateField('content.constraints.prohibitedTopics', updated);
                  }}
                  placeholder="e.g., medical diagnosis"
                />
                <RemoveButton
                  onClick={() => {
                    const updated = prompt.content.constraints.prohibitedTopics.filter((_, i) => i !== index);
                    updateField('content.constraints.prohibitedTopics', updated);
                  }}
                >
                  Remove
                </RemoveButton>
              </ArrayItem>
            ))}
            <AddButton
              onClick={() => {
                const updated = [...prompt.content.constraints.prohibitedTopics, ''];
                updateField('content.constraints.prohibitedTopics', updated);
              }}
            >
              + Add Prohibited Topic
            </AddButton>
          </ArrayInput>
        </FormGroup>

        <FormGroup>
          <Label>Compliance Rules</Label>
          <ArrayInput>
            {prompt.content.constraints.complianceRules.map((rule, index) => (
              <ArrayItem key={index}>
                <Input
                  type="text"
                  value={rule}
                  onChange={(e) => {
                    const updated = [...prompt.content.constraints.complianceRules];
                    updated[index] = e.target.value;
                    updateField('content.constraints.complianceRules', updated);
                  }}
                  placeholder="e.g., HIPAA compliant"
                />
                <RemoveButton
                  onClick={() => {
                    const updated = prompt.content.constraints.complianceRules.filter((_, i) => i !== index);
                    updateField('content.constraints.complianceRules', updated);
                  }}
                >
                  Remove
                </RemoveButton>
              </ArrayItem>
            ))}
            <AddButton
              onClick={() => {
                const updated = [...prompt.content.constraints.complianceRules, ''];
                updateField('content.constraints.complianceRules', updated);
              }}
            >
              + Add Compliance Rule
            </AddButton>
          </ArrayInput>
        </FormGroup>

        <FormGroup>
          <Label>Require User Consent</Label>
          <input
            type="checkbox"
            checked={prompt.content.constraints.requireConsent}
            onChange={(e) => updateField('content.constraints.requireConsent', e.target.checked)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Max Conversation Turns</Label>
          <Input
            type="number"
            value={prompt.content.constraints.maxConversationTurns || 50}
            onChange={(e) => updateField('content.constraints.maxConversationTurns', parseInt(e.target.value))}
            min={1}
            max={200}
            readOnly={isEditMode && !isAdmin}
            style={isEditMode && !isAdmin ? { background: '#f9f9f9', cursor: 'not-allowed' } : {}}
          />
          {isEditMode && !isAdmin && (
            <span style={{ fontSize: '12px', color: '#999', marginTop: '4px', display: 'block' }}>
              Editable by Project Admins or Admins only.
            </span>
          )}
        </FormGroup>
      </LayerSection>

    </>
  );

  // Preview tab content
  const previewContent = (
    <PromptPreview prompt={prompt} modelType="gpt-4" />
  );

  return (
    <EditorContainer>
      <Header>
        <div>
          <Title>{id ? `Edit: ${prompt.name}` : 'Create New Prompt'}</Title>
          {prompt._id && <StatusBadge status={prompt.state}>{prompt.state}</StatusBadge>}
          {prompt.baseTemplateId && (
            <StatusBadge status="template" style={{ background: '#e8f5e9', color: '#2e7d32', marginLeft: '8px' }}>
              📋 From Template
            </StatusBadge>
          )}
          {isEditingNonDraft && (
            <div style={{ fontSize: '12px', color: '#e65100', marginTop: '4px', fontStyle: 'italic' }}>
              ⚠️ First save will create a new draft version
            </div>
          )}
        </div>
        <HeaderActions>
          <SaveIndicator saving={saving}>
            {saving ? 'Saving...' : 'All changes saved'}
          </SaveIndicator>

          {/* Show promotion button for draft state */}
          {prompt._id && prompt.state === 'draft' && !isEditingNonDraft && (
            <Button
              variant="primary"
              onClick={() => {
                setPromoteTarget('testing');
                setShowPromoteModal(true);
              }}
              disabled={saving}
              style={{ background: '#0277bd' }}
            >
              Promote to Testing
            </Button>
          )}

          {/* Show promotion button for testing state */}
          {prompt._id && prompt.state === 'testing' && (
            <Button
              variant="primary"
              onClick={() => {
                setPromoteTarget('production');
                setShowPromoteModal(true);
              }}
              disabled={saving}
              style={{ background: '#2e7d32' }}
            >
              Promote to Production
            </Button>
          )}

          <Button variant="secondary" onClick={handleCancelClick}>
            Cancel
          </Button>

          {/* Save/Update button */}
          {(!prompt._id || prompt.state === 'draft' || isEditingNonDraft) && (
            <Button variant="primary" onClick={handleSaveClick} disabled={saving}>
              {saving ? 'Saving...' :
                (!prompt._id ? 'Create Prompt' :
                  isEditingNonDraft ? 'Save (Create Version)' :
                  'Update Draft')}
            </Button>
          )}
        </HeaderActions>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Configuration | Preview | Analysis tab bar */}
      <TabBar>
        {(
          (prompt._id
            ? ['configuration', 'preview', 'analysis']
            : ['configuration', 'preview']
          ) as ('configuration' | 'preview' | 'analysis')[]
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === tab ? '#1976d2' : '#f5f5f5',
              color: activeTab === tab ? 'white' : '#333',
              fontWeight: activeTab === tab ? '600' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'configuration' ? 'Configuration' : tab === 'preview' ? 'Preview' : '🔍 Analysis'}
          </button>
        ))}
      </TabBar>

      {activeTab === 'configuration' && formContent}
      {activeTab === 'preview' && previewContent}
      {activeTab === 'analysis' && prompt._id && <TestResultsViewer promptVersionId={prompt._id} />}

      {/* Version Creation Warning Modal */}
      {showVersionWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '480px', width: '90%', padding: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#333' }}>⚠️ Create New Version</h2>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
              This will create <strong>version {(prompt?.version || 0) + 1}</strong> of this prompt in <strong>Draft</strong> state.
            </p>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
              Subsequent updates will modify this draft without creating additional versions. You can promote this draft to Testing when ready.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowVersionWarning(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleVersionWarningConfirm} disabled={saving}>
                {saving ? 'Creating Version...' : 'Create Version'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '480px', width: '90%', padding: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#333' }}>
              Promote to {promoteTarget === 'testing' ? 'Testing' : 'Production'}
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
              {promoteTarget === 'testing'
                ? 'This will move the prompt to Testing state where it can be analyzed and validated before production deployment.'
                : 'This will promote the prompt to Production, making it active. The previous production version will be archived.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowPromoteModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => handlePromote(promoteTarget)} disabled={saving}>
                {saving ? 'Promoting...' : `Promote to ${promoteTarget === 'testing' ? 'Testing' : 'Production'}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '420px', width: '90%', padding: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#333' }}>Discard Changes?</h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
              You have unsaved changes. Discarding will revert to the last saved version.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Keep Editing</Button>
              <Button variant="danger" onClick={handleDiscardConfirmed}>Discard Changes</Button>
            </div>
          </div>
        </div>
      )}
    </EditorContainer>
  );
};

export default PromptEditor;
