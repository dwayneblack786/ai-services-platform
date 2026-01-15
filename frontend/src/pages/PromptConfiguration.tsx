import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import styled from '@emotion/styled';

interface PromptConfigurationProps {
  productId?: string;
  initialTab?: 'voice' | 'chat';
}

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  color: #6b7280;
  margin: 0;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 24px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid ${(props) => props.active ? '#4f46e5' : 'transparent'};
  color: ${(props) => props.active ? '#4f46e5' : '#6b7280'};
  font-weight: ${(props) => props.active ? 600 : 400};
  cursor: pointer;
  margin-bottom: -2px;
  transition: all 0.2s;

  &:hover {
    color: #4f46e5;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const CollapsibleCard = styled(Card)<{ collapsed?: boolean }>`
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.collapsed && `
    padding: 16px 24px;
  `}
`;

const CollapsibleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
`;

const CollapsibleIcon = styled.span<{ collapsed?: boolean }>`
  font-size: 20px;
  transition: transform 0.2s;
  color: #6b7280;
  
  ${props => !props.collapsed && `
    transform: rotate(180deg);
  `}
`;

const CollapsibleContent = styled.div<{ collapsed?: boolean }>`
  margin-top: 20px;
  
  ${props => props.collapsed && `
    display: none;
  `}
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const SectionDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0 0;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
`;

const HelpText = styled.p`
  font-size: 13px;
  color: #6b7280;
  margin: 4px 0 0 0;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
`;

const TagRemove = styled.button`
  background: none;
  border: none;
  color: #4338ca;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  
  &:hover {
    color: #3730a3;
  }
`;

const TagInput = styled(Input)`
  margin-top: 8px;
`;

const RepeaterItem = styled.div`
  padding: 16px;
  margin-bottom: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  position: relative;
`;

const RepeaterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const RepeaterTitle = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 14px;
`;

const RemoveButton = styled.button`
  padding: 4px 12px;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  
  &:hover {
    background: #fecaca;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;

  &:hover {
    background: #f9fafb;
  }
`;

const AddButton = styled(SecondaryButton)`
  margin-top: 12px;
`;

const SwitchContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
`;

const SwitchInput = styled.input`
  width: 44px;
  height: 24px;
  position: relative;
  appearance: none;
  background: #d1d5db;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  transition: background 0.2s;
  
  &:checked {
    background: #4f46e5;
  }
  
  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    background: white;
    transition: transform 0.2s;
  }
  
  &:checked::before {
    transform: translateX(20px);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #e5e7eb;
`;

const PrimaryButton = styled(Button)`
  background: #4f46e5;
  color: white;

  &:hover {
    background: #4338ca;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  margin-bottom: 24px;
`;

const SuccessMessage = styled.div`
  padding: 12px 16px;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  color: #065f46;
  margin-bottom: 24px;
`;

interface Location {
  address: string;
  city: string;
  state: string;
}

interface FAQ {
  question: string;
  answer: string;
}

const PromptConfiguration: React.FC<PromptConfigurationProps> = ({ productId, initialTab = 'voice' }) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'chat'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Collapsible section states
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({
    identity: false,
    persona: false,
    knowledge: false,
    rag: false,
    behavior: false,
    safety: false,
    voiceSettings: false,
    chatSettings: false
  });

  // Tag input temporary values
  const [tempTag, setTempTag] = useState('');
  const [tempComplianceRule, setTempComplianceRule] = useState('');
  
  // Business Identity
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [assistantPersona, setAssistantPersona] = useState('');

  // Persona / Tone
  const [tone, setTone] = useState('');
  const [personality, setPersonality] = useState('');
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [disallowedActions, setDisallowedActions] = useState<string[]>([]);

  // Static Business Knowledge
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [pricingInfo, setPricingInfo] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [businessHours, setBusinessHours] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [policies, setPolicies] = useState('');
  const [productCatalog, setProductCatalog] = useState('');

  // RAG Knowledge Sources
  const [ragEnabled, setRagEnabled] = useState(false);
  const [ragDocuments, setRagDocuments] = useState<string[]>([]);
  const [ragUrls, setRagUrls] = useState<string[]>([]);
  const [ragApiEndpoints, setRagApiEndpoints] = useState<string[]>([]);

  // Conversation Behavior
  const [maxTurns, setMaxTurns] = useState<number>(20);
  const [responseLength, setResponseLength] = useState('medium');
  const [escalationRules, setEscalationRules] = useState('');
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [allowedWorkflows, setAllowedWorkflows] = useState<string[]>([]);

  // Safety & Compliance
  const [prohibitedTopics, setProhibitedTopics] = useState<string[]>([]);
  const [requiredDisclaimers, setRequiredDisclaimers] = useState('');
  const [dataHandlingRules, setDataHandlingRules] = useState('');
  const [complianceStandard, setComplianceStandard] = useState('');
  const [complianceRules, setComplianceRules] = useState<string[]>([]);

  // Voice Assistant Settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fallbackNumber, setFallbackNumber] = useState('');
  const [voiceBusinessHours, setVoiceBusinessHours] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [voiceStyle, setVoiceStyle] = useState('friendly');
  const [speakingRate, setSpeakingRate] = useState(1.0);

  // Chat Assistant Settings
  const [chatEnabled, setChatEnabled] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [typingIndicator, setTypingIndicator] = useState(true);
  const [maxMessageLength, setMaxMessageLength] = useState(500);
  const [chatBubbleStyle, setChatBubbleStyle] = useState('modern');

  const toggleSection = (section: string) => {
    setSectionsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load configuration from API
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[PromptConfig] Loading configuration for productId:', productId);
        const endpoint = productId 
          ? `/api/assistant-channels/${productId}`
          : '/api/assistant-channels';
        
        console.log('[PromptConfig] Loading from:', endpoint);
        const response = await apiClient.get(endpoint);
        const config = response.data;
        console.log('[PromptConfig] API response:', config);
        
        console.log('[PromptConfig] Received config:', {
          hasVoice: !!config.voice,
          hasChat: !!config.chat,
          hasPromptContext: !!config.voice?.promptContext,
          hasCustomPrompts: !!config.voice?.customPrompts,
          tenantName: config.voice?.promptContext?.tenantName,
          servicesCount: config.voice?.promptContext?.servicesOffered?.length,
          faqsCount: config.voice?.promptContext?.faqs?.length
        });
        
        // Load voice configuration
        if (config.voice) {
          const voice = config.voice;
          
          // Business Identity
          setBusinessName(voice.promptContext?.tenantName || '');
          setIndustry(voice.promptContext?.tenantIndustry || '');
          setBrandVoice(voice.promptContext?.businessContext || '');
          
          // Persona
          setTone(voice.promptContext?.tone || '');
          setPersonality(voice.promptContext?.personality || '');
          setAllowedActions(voice.promptContext?.allowedActions || []);
          setDisallowedActions(voice.promptContext?.disallowedActions || []);
          
          // Knowledge
          setServicesOffered(voice.promptContext?.servicesOffered || []);
          setPricingInfo(voice.promptContext?.pricingInfo || '');
          setLocations(voice.promptContext?.locations || []);
          setBusinessHours(voice.promptContext?.businessHours || '');
          setFaqs(voice.promptContext?.faqs || []);
          setPolicies(voice.promptContext?.policies || '');
          setProductCatalog(voice.promptContext?.productCatalog || '');
          
          // RAG
          setRagEnabled(voice.ragConfig?.enabled || false);
          const ragSources = voice.ragConfig?.sources || [];
          setRagUrls(ragSources.map((s: any) => s.url) || []);
          
          // Behavior
          setMaxTurns(voice.customPrompts?.maxConversationTurns || 20);
          setResponseLength(voice.promptContext?.maxResponseLength ? 'custom' : 'medium');
          const triggers = voice.promptContext?.escalationTriggers || [];
          setEscalationRules(triggers.join(', '));
          
          // Safety
          setProhibitedTopics(voice.customPrompts?.prohibitedTopics || []);
          setComplianceRules(voice.customPrompts?.complianceRules || []);
          setRequiredDisclaimers(voice.customPrompts?.privacyPolicy || '');
          setDataHandlingRules(voice.customPrompts?.sensitiveDataHandling || '');
          
          // Voice Settings
          setVoiceEnabled(voice.enabled || false);
          setPhoneNumber(voice.phoneNumber || '');
          setFallbackNumber(voice.fallbackNumber || '');
          setVoiceLanguage(voice.voiceSettings?.language || 'en-US');
          setSpeakingRate(voice.voiceSettings?.speechRate || 1.0);
        }
        
        // Load chat configuration
        if (config.chat) {
          const chat = config.chat;
          setChatEnabled(chat.enabled || false);
          setGreetingMessage(chat.greeting || '');
          setTypingIndicator(chat.typingIndicator !== false);
          setMaxMessageLength(chat.maxTurns || 20);
        }
        
        console.log('[PromptConfig] State updated successfully');
        
      } catch (err: any) {
        console.error('[PromptConfig] Error loading configuration:', err);
        console.error('[PromptConfig] Error details:', err.response?.data);
        setError('Failed to load configuration: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };
    
    loadConfiguration();
  }, [productId]);

  const handleAddTag = (tags: string[], setTags: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    if (value.trim() && !tags.includes(value.trim())) {
      setTags([...tags, value.trim()]);
      setTempTag('');
    }
  };

  const handleRemoveTag = (tags: string[], setTags: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Build the configuration object matching the backend schema
      const updateData = {
        voice: {
          enabled: voiceEnabled,
          phoneNumber,
          fallbackNumber,
          voiceSettings: {
            language: voiceLanguage,
            speechRate: speakingRate,
            pitch: 0
          },
          promptContext: {
            tenantName: businessName,
            tenantIndustry: industry,
            businessContext: brandVoice,
            tone,
            personality,
            allowedActions,
            disallowedActions,
            servicesOffered,
            pricingInfo,
            locations,
            businessHours,
            faqs,
            policies,
            productCatalog,
            maxResponseLength: responseLength === 'custom' ? 200 : 150,
            escalationTriggers: escalationRules.split(',').map(t => t.trim()).filter(t => t),
            defaultLanguage: voiceLanguage
          },
          customPrompts: {
            prohibitedTopics,
            complianceRules,
            privacyPolicy: requiredDisclaimers,
            sensitiveDataHandling: dataHandlingRules,
            maxConversationTurns: maxTurns,
            logConversations: true
          },
          ragConfig: {
            enabled: ragEnabled,
            sources: ragUrls.map(url => ({
              url,
              type: 'website',
              description: 'Business resource'
            }))
          }
        },
        chat: {
          enabled: chatEnabled,
          greeting: greetingMessage,
          typingIndicator,
          maxTurns: maxMessageLength,
          promptContext: {
            tenantName: businessName,
            tenantIndustry: industry,
            businessContext: brandVoice,
            tone,
            personality,
            allowedActions,
            disallowedActions,
            servicesOffered,
            pricingInfo,
            locations,
            businessHours,
            faqs,
            policies,
            productCatalog
          },
          customPrompts: {
            prohibitedTopics,
            complianceRules,
            privacyPolicy: requiredDisclaimers,
            sensitiveDataHandling: dataHandlingRules
          }
        }
      };

      const endpoint = productId 
        ? `/api/assistant-channels/${productId}`
        : '/api/assistant-channels';
      
      await apiClient.patch(endpoint, updateData);
      
      setSuccess('Configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to save configuration: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>Virtual Assistant Configuration</Title>
        <Subtitle>Configure your AI assistant's behavior, knowledge, and safety constraints</Subtitle>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <TabContainer>
        <Tab active={activeTab === 'voice'} onClick={() => setActiveTab('voice')}>
          Voice Assistant
        </Tab>
        <Tab active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
          Chat Assistant
        </Tab>
      </TabContainer>

      {/* Section 1: Business Identity */}
      <CollapsibleCard collapsed={sectionsCollapsed.identity}>
        <CollapsibleHeader onClick={() => toggleSection('identity')}>
          <div>
            <SectionTitle>Business Identity</SectionTitle>
            <SectionDescription>Define your assistant's role and brand voice</SectionDescription>
          </div>
          <CollapsibleIcon collapsed={sectionsCollapsed.identity}>▼</CollapsibleIcon>
        </CollapsibleHeader>
        <CollapsibleContent collapsed={sectionsCollapsed.identity} onClick={(e) => e.stopPropagation()}>
          <FormGroup>
            <Label>Business Name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., Acme Healthcare"
            />
          </FormGroup>

          <FormGroup>
            <Label>Industry</Label>
            <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">Select Industry</option>
              <option value="healthcare">Healthcare</option>
              <option value="realestate">Real Estate</option>
              <option value="legal">Legal</option>
              <option value="finance">Finance</option>
              <option value="retail">Retail</option>
              <option value="education">Education</option>
              <option value="technology">Technology</option>
              <option value="other">Other</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Brand Voice</Label>
            <Select value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)}>
              <option value="">Select Brand Voice</option>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="empathetic">Empathetic</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Assistant Persona</Label>
            <TextArea
              value={assistantPersona}
              onChange={(e) => setAssistantPersona(e.target.value)}
              placeholder="Describe who your assistant is and how it should behave..."
              rows={4}
            />
            <HelpText>Be specific about the assistant's role, personality, and communication style</HelpText>
          </FormGroup>
        </CollapsibleContent>
      </CollapsibleCard>

      {/* Section 2: Assistant Persona */}
      <CollapsibleCard collapsed={sectionsCollapsed.persona}>
        <CollapsibleHeader onClick={() => toggleSection('persona')}>
          <div>
            <SectionTitle>Assistant Persona</SectionTitle>
            <SectionDescription>Configure tone, personality, and allowed actions</SectionDescription>
          </div>
          <CollapsibleIcon collapsed={sectionsCollapsed.persona}>▼</CollapsibleIcon>
        </CollapsibleHeader>
        <CollapsibleContent collapsed={sectionsCollapsed.persona} onClick={(e) => e.stopPropagation()}>
          <FormGroup>
            <Label>Tone</Label>
            <Input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g., warm and professional"
            />
          </FormGroup>

          <FormGroup>
            <Label>Personality</Label>
            <Input
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="e.g., helpful, patient, detail-oriented"
            />
          </FormGroup>

          <FormGroup>
            <Label>Allowed Actions</Label>
            <TagContainer>
              {allowedActions.map((action, index) => (
                <Tag key={index}>
                  {action}
                  <TagRemove onClick={() => handleRemoveTag(allowedActions, setAllowedActions, index)}>×</TagRemove>
                </Tag>
              ))}
            </TagContainer>
            <TagInput
              value={tempTag}
              onChange={(e) => setTempTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(allowedActions, setAllowedActions, tempTag);
                }
              }}
              placeholder="Type an action and press Enter (e.g., book_appointment, provide_quote)"
            />
            <HelpText>Actions the assistant can perform</HelpText>
          </FormGroup>

          <FormGroup>
            <Label>Disallowed Actions</Label>
            <TagContainer>
              {disallowedActions.map((action, index) => (
                <Tag key={index} style={{ background: '#fee2e2', color: '#991b1b' }}>
                  {action}
                  <TagRemove onClick={() => handleRemoveTag(disallowedActions, setDisallowedActions, index)}>×</TagRemove>
                </Tag>
              ))}
            </TagContainer>
            <TagInput
              value={tempTag}
              onChange={(e) => setTempTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(disallowedActions, setDisallowedActions, tempTag);
                }
              }}
              placeholder="Type an action and press Enter (e.g., give_medical_advice, provide_legal_counsel)"
            />
            <HelpText>Actions the assistant must never perform</HelpText>
          </FormGroup>
        </CollapsibleContent>
      </CollapsibleCard>

      {/* Section 3: Static Business Knowledge */}
      <CollapsibleCard collapsed={sectionsCollapsed.knowledge}>
        <CollapsibleHeader onClick={() => toggleSection('knowledge')}>
          <div>
            <SectionTitle>Static Business Knowledge</SectionTitle>
            <SectionDescription>Always-on context about your business</SectionDescription>
          </div>
          <CollapsibleIcon collapsed={sectionsCollapsed.knowledge}>▼</CollapsibleIcon>
        </CollapsibleHeader>
        <CollapsibleContent collapsed={sectionsCollapsed.knowledge} onClick={(e) => e.stopPropagation()}>
          <FormGroup>
            <Label>Services Offered</Label>
            <TagContainer>
              {servicesOffered.map((service, index) => (
                <Tag key={index}>
                  {service}
                  <TagRemove onClick={() => handleRemoveTag(servicesOffered, setServicesOffered, index)}>×</TagRemove>
                </Tag>
              ))}
            </TagContainer>
            <TagInput
              value={tempTag}
              onChange={(e) => setTempTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(servicesOffered, setServicesOffered, tempTag);
                }
              }}
              placeholder="Add a service and press Enter"
            />
          </FormGroup>

          <FormGroup>
            <Label>Pricing Summary</Label>
            <TextArea
              value={pricingInfo}
              onChange={(e) => setPricingInfo(e.target.value)}
              placeholder="Describe your pricing structure..."
              rows={4}
            />
          </FormGroup>

          <FormGroup>
            <Label>Locations</Label>
            {locations.map((location, index) => (
              <RepeaterItem key={index}>
                <RepeaterHeader>
                  <RepeaterTitle>Location {index + 1}</RepeaterTitle>
                  <RemoveButton onClick={() => setLocations(locations.filter((_, i) => i !== index))}>
                    Remove
                  </RemoveButton>
                </RepeaterHeader>
                <FormGroup>
                  <Label>Address</Label>
                  <Input
                    value={location.address}
                    onChange={(e) => {
                      const newLocations = [...locations];
                      newLocations[index].address = e.target.value;
                      setLocations(newLocations);
                    }}
                    placeholder="Street address"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>City</Label>
                  <Input
                    value={location.city}
                    onChange={(e) => {
                      const newLocations = [...locations];
                      newLocations[index].city = e.target.value;
                      setLocations(newLocations);
                    }}
                    placeholder="City"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>State</Label>
                  <Input
                    value={location.state}
                    onChange={(e) => {
                      const newLocations = [...locations];
                      newLocations[index].state = e.target.value;
                      setLocations(newLocations);
                    }}
                    placeholder="State"
                  />
                </FormGroup>
              </RepeaterItem>
            ))}
            <AddButton onClick={() => setLocations([...locations, { address: '', city: '', state: '' }])}>
              + Add Location
            </AddButton>
          </FormGroup>

          <FormGroup>
            <Label>Business Hours</Label>
            <Input
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
              placeholder="e.g., Mon-Fri 9AM-5PM, Sat 10AM-2PM"
            />
          </FormGroup>

          <FormGroup>
            <Label>FAQs</Label>
            {faqs.map((faq, index) => (
              <RepeaterItem key={index}>
                <RepeaterHeader>
                  <RepeaterTitle>FAQ {index + 1}</RepeaterTitle>
                  <RemoveButton onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}>
                    Remove
                  </RemoveButton>
                </RepeaterHeader>
                <FormGroup>
                  <Label>Question</Label>
                  <Input
                    value={faq.question}
                    onChange={(e) => {
                      const newFaqs = [...faqs];
                      newFaqs[index].question = e.target.value;
                      setFaqs(newFaqs);
                    }}
                    placeholder="What is your return policy?"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Answer</Label>
                  <TextArea
                    value={faq.answer}
                    onChange={(e) => {
                      const newFaqs = [...faqs];
                      newFaqs[index].answer = e.target.value;
                      setFaqs(newFaqs);
                    }}
                    placeholder="We offer 30-day returns..."
                    rows={3}
                  />
                </FormGroup>
              </RepeaterItem>
            ))}
            <AddButton onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}>
              + Add FAQ
            </AddButton>
          </FormGroup>

          <FormGroup>
            <Label>Policies</Label>
            <TextArea
              value={policies}
              onChange={(e) => setPolicies(e.target.value)}
              placeholder="Return policy, cancellation policy, privacy policy..."
              rows={6}
            />
          </FormGroup>

          <FormGroup>
            <Label>Product Catalog</Label>
            <TextArea
              value={productCatalog}
              onChange={(e) => setProductCatalog(e.target.value)}
              placeholder="List your products or services with descriptions..."
              rows={6}
            />
          </FormGroup>
        </CollapsibleContent>
      </CollapsibleCard>

      {/* Section 4: RAG Knowledge Sources */}
      <CollapsibleCard collapsed={sectionsCollapsed.rag}>
        <CollapsibleHeader onClick={() => toggleSection('rag')}>
          <div>
            <SectionTitle>RAG Knowledge Sources</SectionTitle>
            <SectionDescription>Upload documents or link external knowledge bases</SectionDescription>
          </div>
          <CollapsibleIcon collapsed={sectionsCollapsed.rag}>▼</CollapsibleIcon>
        </CollapsibleHeader>
        <CollapsibleContent collapsed={sectionsCollapsed.rag} onClick={(e) => e.stopPropagation()}>
          <FormGroup>
            <SwitchContainer>
              <SwitchInput
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => setRagEnabled(e.target.checked)}
              />
              <span>Enable RAG (Retrieval Augmented Generation)</span>
            </SwitchContainer>
            <HelpText>Allow assistant to retrieve information from external sources</HelpText>
          </FormGroup>

          {ragEnabled && (
            <>
              <FormGroup>
                <Label>Upload Documents</Label>
                <Input type="file" multiple accept=".pdf,.docx,.txt" />
                <HelpText>Upload PDF, Word, or text files</HelpText>
              </FormGroup>

              <FormGroup>
                <Label>Website URLs</Label>
                {ragUrls.map((url, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <Input
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...ragUrls];
                        newUrls[index] = e.target.value;
                        setRagUrls(newUrls);
                      }}
                      placeholder="https://example.com"
                    />
                    <RemoveButton onClick={() => setRagUrls(ragUrls.filter((_, i) => i !== index))}>
                      Remove
                    </RemoveButton>
                  </div>
                ))}
                <AddButton onClick={() => setRagUrls([...ragUrls, ''])}>+ Add Website URL</AddButton>
              </FormGroup>

              <FormGroup>
                <Label>API Endpoints</Label>
                {ragApiEndpoints.map((endpoint, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <Input
                      value={endpoint}
                      onChange={(e) => {
                        const newEndpoints = [...ragApiEndpoints];
                        newEndpoints[index] = e.target.value;
                        setRagApiEndpoints(newEndpoints);
                      }}
                      placeholder="https://api.example.com/knowledge"
                    />
                    <RemoveButton onClick={() => setRagApiEndpoints(ragApiEndpoints.filter((_, i) => i !== index))}>
                      Remove
                    </RemoveButton>
                  </div>
                ))}
                <AddButton onClick={() => setRagApiEndpoints([...ragApiEndpoints, ''])}>+ Add API Endpoint</AddButton>
              </FormGroup>
            </>
          )}
        </CollapsibleContent>
      </CollapsibleCard>

      {/* Section 5: Conversation Behavior */}
      <CollapsibleCard collapsed={sectionsCollapsed.behavior}>
        <CollapsibleHeader onClick={() => toggleSection('behavior')}>
          <div>
            <SectionTitle>Conversation Behavior</SectionTitle>
            <SectionDescription>Control how the assistant behaves in sessions</SectionDescription>
          </div>
          <CollapsibleIcon collapsed={sectionsCollapsed.behavior}>▼</CollapsibleIcon>
        </CollapsibleHeader>
        <CollapsibleContent collapsed={sectionsCollapsed.behavior} onClick={(e) => e.stopPropagation()}>
          <FormGroup>
            <Label>Max Conversation Turns</Label>
            <Input
              type="number"
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value))}
              placeholder="20"
            />
            <HelpText>Maximum number of back-and-forth exchanges</HelpText>
          </FormGroup>

          <FormGroup>
            <Label>Response Length</Label>
            <Select value={responseLength} onChange={(e) => setResponseLength(e.target.value)}>
              <option value="concise">Concise (1-2 sentences)</option>
              <option value="medium">Medium (2-4 sentences)</option>
              <option value="detailed">Detailed (4+ sentences)</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Escalation Rules</Label>
            <TextArea
              value={escalationRules}
              onChange={(e) => setEscalationRules(e.target.value)}
              placeholder="When to transfer to a human agent..."
              rows={4}
            />
          </FormGroup>

          <FormGroup>
            <Label>Required Fields Before Workflow</Label>
            <TagContainer>
              {requiredFields.map((field, index) => (
                <Tag key={index}>
                  {field}
                  <TagRemove onClick={() => handleRemoveTag(requiredFields, setRequiredFields, index)}>×</TagRemove>
                </Tag>
              ))}
            </TagContainer>
            <TagInput
              value={tempTag}
              onChange={(e) => setTempTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(requiredFields, setRequiredFields, tempTag);
                }
              }}
              placeholder="e.g., customer_name, phone_number"
            />
          </FormGroup>

          <FormGroup>
            <Label>Allowed Workflows</Label>
            <TagContainer>
              {allowedWorkflows.map((workflow, index) => (
                <Tag key={index}>
                  {workflow}
                  <TagRemove onClick={() => handleRemoveTag(allowedWorkflows, setAllowedWorkflows, index)}>×</TagRemove>
                </Tag>
              ))}
            </TagContainer>
            <TagInput
              value={tempTag}
              onChange={(e) => setTempTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(allowedWorkflows, setAllowedWorkflows, tempTag);
                }
              }}
              placeholder="e.g., appointment_booking, quote_request"
            />
          </FormGroup>
        </CollapsibleContent>
      </CollapsibleCard>

      {/* Section 6: Safety & Compliance */}
      <CollapsibleCard collapsed={sectionsCollapsed.safety}>
        <CollapsibleHeader onClick={() => toggleSection('safety')}>
          <div>
            <SectionTitle>Safety & Compliance</SectionTitle>
            <SectionDescription>Define guardrails and restrictions</SectionDescription>
          </div>
          <CollapsibleIcon collapsed={sectionsCollapsed.safety}>▼</CollapsibleIcon>
        </CollapsibleHeader>
        <CollapsibleContent collapsed={sectionsCollapsed.safety} onClick={(e) => e.stopPropagation()}>
          <FormGroup>
            <Label>Prohibited Topics</Label>
            <TagContainer>
              {prohibitedTopics.map((topic, index) => (
                <Tag key={index} style={{ background: '#fee2e2', color: '#991b1b' }}>
                  {topic}
                  <TagRemove onClick={() => handleRemoveTag(prohibitedTopics, setProhibitedTopics, index)}>×</TagRemove>
                </Tag>
              ))}
            </TagContainer>
            <TagInput
              value={tempTag}
              onChange={(e) => setTempTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(prohibitedTopics, setProhibitedTopics, tempTag);
                }
              }}
              placeholder="e.g., politics, religion, medical diagnosis"
            />
          </FormGroup>

          <FormGroup>
            <Label>Compliance Rules</Label>
            {complianceRules.map((rule, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Input
                  value={rule}
                  onChange={(e) => {
                    const newRules = [...complianceRules];
                    newRules[index] = e.target.value;
                    setComplianceRules(newRules);
                  }}
                  placeholder="Compliance rule"
                />
                <RemoveButton onClick={() => setComplianceRules(complianceRules.filter((_, i) => i !== index))}>
                  Remove
                </RemoveButton>
              </div>
            ))}
            <AddButton onClick={() => setComplianceRules([...complianceRules, ''])}>+ Add Rule</AddButton>
          </FormGroup>

          <FormGroup>
            <Label>Required Disclaimers</Label>
            <TextArea
              value={requiredDisclaimers}
              onChange={(e) => setRequiredDisclaimers(e.target.value)}
              placeholder="Disclaimers that must be shown to users..."
              rows={4}
            />
          </FormGroup>

          <FormGroup>
            <Label>Data Handling Rules</Label>
            <TextArea
              value={dataHandlingRules}
              onChange={(e) => setDataHandlingRules(e.target.value)}
              placeholder="How to handle sensitive data..."
              rows={4}
            />
          </FormGroup>

          <FormGroup>
            <Label>Industry Compliance</Label>
            <Select value={complianceStandard} onChange={(e) => setComplianceStandard(e.target.value)}>
              <option value="">Select Standard</option>
              <option value="hipaa">HIPAA (Healthcare)</option>
              <option value="gdpr">GDPR (Privacy)</option>
              <option value="pci">PCI DSS (Payment)</option>
              <option value="sox">SOX (Financial)</option>
              <option value="ccpa">CCPA (California Privacy)</option>
            </Select>
          </FormGroup>
        </CollapsibleContent>
      </CollapsibleCard>

      {/* Section 7: Voice Assistant Settings */}
      {activeTab === 'voice' && (
        <CollapsibleCard collapsed={sectionsCollapsed.voiceSettings}>
          <CollapsibleHeader onClick={() => toggleSection('voiceSettings')}>
            <div>
              <SectionTitle>Voice Assistant Settings</SectionTitle>
              <SectionDescription>Configure phone-based assistant</SectionDescription>
            </div>
            <CollapsibleIcon collapsed={sectionsCollapsed.voiceSettings}>▼</CollapsibleIcon>
          </CollapsibleHeader>
          <CollapsibleContent collapsed={sectionsCollapsed.voiceSettings} onClick={(e) => e.stopPropagation()}>
            <FormGroup>
              <SwitchContainer>
                <SwitchInput
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                />
                <span>Enable Voice Assistant</span>
              </SwitchContainer>
            </FormGroup>

            {voiceEnabled && (
              <>
                <FormGroup>
                  <Label>Phone Number</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Fallback Number (Human Transfer)</Label>
                  <Input
                    value={fallbackNumber}
                    onChange={(e) => setFallbackNumber(e.target.value)}
                    placeholder="+1 (555) 987-6543"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Business Hours</Label>
                  <Input
                    value={voiceBusinessHours}
                    onChange={(e) => setVoiceBusinessHours(e.target.value)}
                    placeholder="Mon-Fri 9AM-5PM"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Voice Language</Label>
                  <Select value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value)}>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Voice Style</Label>
                  <Select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}>
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="cheerful">Cheerful</option>
                    <option value="empathetic">Empathetic</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Speaking Rate: {speakingRate}x</Label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speakingRate}
                    onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <HelpText>0.5x (slower) to 2.0x (faster)</HelpText>
                </FormGroup>
              </>
            )}
          </CollapsibleContent>
        </CollapsibleCard>
      )}

      {/* Section 8: Chat Assistant Settings */}
      {activeTab === 'chat' && (
        <CollapsibleCard collapsed={sectionsCollapsed.chatSettings}>
          <CollapsibleHeader onClick={() => toggleSection('chatSettings')}>
            <div>
              <SectionTitle>Chat Assistant Settings</SectionTitle>
              <SectionDescription>Configure web-based chatbot</SectionDescription>
            </div>
            <CollapsibleIcon collapsed={sectionsCollapsed.chatSettings}>▼</CollapsibleIcon>
          </CollapsibleHeader>
          <CollapsibleContent collapsed={sectionsCollapsed.chatSettings} onClick={(e) => e.stopPropagation()}>
            <FormGroup>
              <SwitchContainer>
                <SwitchInput
                  type="checkbox"
                  checked={chatEnabled}
                  onChange={(e) => setChatEnabled(e.target.checked)}
                />
                <span>Enable Chat Assistant</span>
              </SwitchContainer>
            </FormGroup>

            {chatEnabled && (
              <>
                <FormGroup>
                  <Label>Greeting Message</Label>
                  <Input
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    placeholder="Hi! How can I help you today?"
                  />
                </FormGroup>

                <FormGroup>
                  <SwitchContainer>
                    <SwitchInput
                      type="checkbox"
                      checked={typingIndicator}
                      onChange={(e) => setTypingIndicator(e.target.checked)}
                    />
                    <span>Show Typing Indicator</span>
                  </SwitchContainer>
                </FormGroup>

                <FormGroup>
                  <Label>Max Message Length</Label>
                  <Input
                    type="number"
                    value={maxMessageLength}
                    onChange={(e) => setMaxMessageLength(parseInt(e.target.value))}
                    placeholder="500"
                  />
                  <HelpText>Maximum characters per message</HelpText>
                </FormGroup>

                <FormGroup>
                  <Label>Chat Bubble Style</Label>
                  <Select value={chatBubbleStyle} onChange={(e) => setChatBubbleStyle(e.target.value)}>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                    <option value="rounded">Rounded</option>
                  </Select>
                </FormGroup>
              </>
            )}
          </CollapsibleContent>
        </CollapsibleCard>
      )}

      {/* Action Buttons */}
      <ButtonGroup>
        <SecondaryButton onClick={() => window.location.reload()}>
          Reset
        </SecondaryButton>
        <SecondaryButton>
          Preview Assistant
        </SecondaryButton>
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </PrimaryButton>
      </ButtonGroup>
    </PageContainer>
  );
};

export default PromptConfiguration;
