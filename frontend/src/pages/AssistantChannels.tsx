import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import {
  PageContainer,
  Header,
  Title,
  Subtitle,
  ChannelGrid,
  ChannelCard,
  ChannelHeader,
  ChannelTitle,
  ToggleSwitch,
  StatusBadge,
  ConfigSection,
  ConfigLabel,
  ConfigValue,
  Button,
  SecondaryButton,
  ButtonGroup,
  ErrorMessage,
} from '../styles/AssistantChannels.styles';

interface AssistantChannelsProps {
  productId?: string;
  onNavigate?: (tab: string) => void;
}

interface VoiceChannelConfig {
  enabled: boolean;
  phoneNumber?: string;
  fallbackNumber?: string;
  voiceSettings?: {
    language: string;
    voiceId: string;
  };
}

interface ChatChannelConfig {
  enabled: boolean;
  greeting?: string;
  typingIndicator?: boolean;
  maxTurns?: number;
  showIntent?: boolean;
}

interface SmsChannelConfig {
  enabled: boolean;
  phoneNumber?: string;
}

interface WhatsAppChannelConfig {
  enabled: boolean;
  businessAccountId?: string;
}

interface AssistantChannels {
  _id: string;
  customerId: string;
  voice?: VoiceChannelConfig;
  chat?: ChatChannelConfig;
  sms?: SmsChannelConfig;
  whatsapp?: WhatsAppChannelConfig;
}

const AssistantChannels: React.FC<AssistantChannelsProps> = ({ productId, onNavigate }) => {
  const navigate = useNavigate();
  const { isTenantAdmin, user } = useAuth();
  const [channels, setChannels] = useState<AssistantChannels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Check if user has admin permissions
  const canManageChannels = isTenantAdmin();
  
  // Debug logging
  useEffect(() => {
    logger.debug('[AssistantChannels] User role:', { role: user?.role });
    logger.debug('[AssistantChannels] isTenantAdmin():', { isTenantAdmin: isTenantAdmin() });
    logger.debug('[AssistantChannels] canManageChannels:', { canManageChannels });
  }, [user, canManageChannels]);

  useEffect(() => {
    if (productId) {
      fetchChannels();
    }
  }, [productId]);

  const fetchChannels = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(
        `/api/assistant-channels/${productId}`
      );

      setChannels(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load channels');
      console.error('Error fetching channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (channelType: string, currentState: boolean) => {
    if (!channels || !productId) return;

    // Check permissions
    if (!canManageChannels) {
      setError('You do not have permission to manage channels. Only tenant admins and project admins can enable/disable channels.');
      return;
    }

    try {
      setUpdating(channelType);
      setError(null);

      await apiClient.post(
        `/api/assistant-channels/${productId}/${channelType}/toggle`,
        { enabled: !currentState }
      );

      // Refresh channels
      await fetchChannels();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to toggle ${channelType} channel`);
      console.error(`Error toggling ${channelType}:`, err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <PageContainer>Loading channels...</PageContainer>;
  }

  if (!channels) {
    return <PageContainer>No channel configuration found</PageContainer>;
  }

  return (
    <PageContainer>
      <Header>
        <Title>Assistant Channels</Title>
        <Subtitle>Configure and manage communication channels for your AI assistant</Subtitle>
        {!canManageChannels && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            backgroundColor: '#fef3c7', 
            border: '1px solid #fbbf24',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#92400e'
          }}>
            ⚠️ You have view-only access. Only tenant admins and project admins can enable/disable channels.
          </div>
        )}
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ChannelGrid>
        {/* Voice Channel */}
        <ChannelCard 
          enabled={channels.voice?.enabled || false}
          title="Voice Channel - Enable phone-based AI assistant conversations"
        >
          <ChannelHeader>
            <ChannelTitle>📞 Voice Channel</ChannelTitle>
            <ToggleSwitch title={
              !canManageChannels ? 'Only tenant admins and project admins can enable/disable voice channel' :
              channels.voice?.enabled ? 'Disable Voice Channel' : 'Enable Voice Channel'
            }>
              <input
                type="checkbox"
                checked={channels.voice?.enabled || false}
                onChange={() => toggleChannel('voice', channels.voice?.enabled || false)}
                disabled={updating === 'voice' || !canManageChannels}
                title={
                  !canManageChannels ? 'You do not have permission to change this setting' :
                  channels.voice?.enabled ? 'Click to disable voice channel' : 'Click to enable voice channel'
                }
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge 
            enabled={channels.voice?.enabled || false}
            title={channels.voice?.enabled ? 'Voice channel is currently active' : 'Voice channel is currently inactive'}
          >
            {channels.voice?.enabled ? 'Enabled' : 'Disabled'}
          </StatusBadge>

          {channels.voice?.enabled && (
            <ConfigSection>
              <ConfigLabel>Phone Number</ConfigLabel>
              <ConfigValue>{channels.voice.phoneNumber || 'Not configured'}</ConfigValue>

              {channels.voice.fallbackNumber && (
                <>
                  <ConfigLabel>Fallback Number</ConfigLabel>
                  <ConfigValue>{channels.voice.fallbackNumber}</ConfigValue>
                </>
              )}

              {channels.voice.voiceSettings && (
                <>
                  <ConfigLabel>Voice</ConfigLabel>
                  <ConfigValue>
                    {channels.voice.voiceSettings.voiceId} ({channels.voice.voiceSettings.language})
                  </ConfigValue>
                </>
              )}
            </ConfigSection>
          )}

          <ButtonGroup>
            <Button 
              onClick={() => onNavigate?.('prompt-config:voice')}
              title="Configure voice channel settings, prompts, and voice preferences"
            >
              Configure Voice Prompts
            </Button>
            <SecondaryButton 
              onClick={() => navigate(`/voice-demo?productId=${productId}`)}
              title="Try out the interactive voice demo with real-time speech-to-text and text-to-speech"
            >
              🎙️ Try Voice Demo
            </SecondaryButton>
          </ButtonGroup>
        </ChannelCard>

        {/* Chat Channel */}
        <ChannelCard 
          enabled={channels.chat?.enabled || false}
          title="Chat Channel - Enable text-based AI assistant conversations"
        >
          <ChannelHeader>
            <ChannelTitle>💬 Chat Channel</ChannelTitle>
            <ToggleSwitch title={
              !canManageChannels ? 'Only tenant admins and project admins can enable/disable chat channel' :
              channels.chat?.enabled ? 'Disable Chat Channel' : 'Enable Chat Channel'
            }>
              <input
                type="checkbox"
                checked={channels.chat?.enabled || false}
                onChange={() => toggleChannel('chat', channels.chat?.enabled || false)}
                disabled={updating === 'chat' || !canManageChannels}
                title={
                  !canManageChannels ? 'You do not have permission to change this setting' :
                  channels.chat?.enabled ? 'Click to disable chat channel' : 'Click to enable chat channel'
                }
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge 
            enabled={channels.chat?.enabled || false}
            title={channels.chat?.enabled ? 'Chat channel is currently active' : 'Chat channel is currently inactive'}
          >
            {channels.chat?.enabled ? 'Enabled' : 'Disabled'}
          </StatusBadge>

          {channels.chat?.enabled && (
            <ConfigSection>
              <ConfigLabel>Greeting</ConfigLabel>
              <ConfigValue>{channels.chat.greeting || 'Default greeting'}</ConfigValue>

              <ConfigLabel>Max Turns</ConfigLabel>
              <ConfigValue>{channels.chat.maxTurns || 20}</ConfigValue>

              <ConfigLabel>Features</ConfigLabel>
              <ConfigValue>
                {channels.chat.typingIndicator && '✓ Typing indicator '}
                {channels.chat.showIntent && '✓ Show intent'}
              </ConfigValue>
            </ConfigSection>
          )}

          <Button 
            style={{ marginTop: '16px' }} 
            onClick={() => onNavigate?.('prompt-config:chat')}
            title="Configure chat channel settings, greetings, and behavior"
          >
            Configure Chat Prompts
          </Button>
        </ChannelCard>

        {/* SMS Channel */}
        <ChannelCard 
          enabled={channels.sms?.enabled || false}
          title="SMS Channel - Coming soon: Enable SMS-based conversations"
        >
          <ChannelHeader>
            <ChannelTitle>📱 SMS Channel</ChannelTitle>
            <ToggleSwitch title="SMS Channel - Coming Soon">
              <input
                type="checkbox"
                checked={channels.sms?.enabled || false}
                disabled
                title="SMS channel is not yet available"
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge enabled={false} title="This feature is in development and will be available soon">Coming Soon</StatusBadge>
          
          <ConfigSection>
            <ConfigValue style={{ color: '#9ca3af' }}>
              SMS channel will allow text-based conversations via SMS messaging.
            </ConfigValue>
          </ConfigSection>
        </ChannelCard>

        {/* WhatsApp Channel */}
        <ChannelCard 
          enabled={channels.whatsapp?.enabled || false}
          title="WhatsApp Channel - Coming soon: Enable WhatsApp Business integration"
        >
          <ChannelHeader>
            <ChannelTitle>💚 WhatsApp Channel</ChannelTitle>
            <ToggleSwitch title="WhatsApp Channel - Coming Soon">
              <input
                type="checkbox"
                checked={channels.whatsapp?.enabled || false}
                disabled
                title="WhatsApp channel is not yet available"
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge enabled={false} title="This feature is in development and will be available soon">Coming Soon</StatusBadge>

          <ConfigSection>
            <ConfigValue style={{ color: '#9ca3af' }}>
              WhatsApp channel will integrate with WhatsApp Business API for rich messaging.
            </ConfigValue>
          </ConfigSection>
        </ChannelCard>
      </ChannelGrid>
    </PageContainer>
  );
};

export default AssistantChannels;
