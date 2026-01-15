import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import styled from '@emotion/styled';

interface AssistantChannelsProps {
  productId?: string;
  onNavigate?: (tab: string) => void;
}

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
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
  color: #666;
  margin: 0;
`;

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const ChannelCard = styled.div<{ enabled: boolean }>`
  background: white;
  border: 2px solid ${(props: { enabled: boolean }) => props.enabled ? '#10b981' : '#e5e7eb'};
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ChannelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ChannelTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 24px;

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
  }

  input:checked + span {
    background-color: #10b981;
  }

  input:checked + span:before {
    transform: translateX(24px);
  }
`;

const StatusBadge = styled.span<{ enabled: boolean }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${(props: { enabled: boolean }) => props.enabled ? '#10b981' : '#6b7280'};
  background: ${(props: { enabled: boolean }) => props.enabled ? '#d1fae5' : '#f3f4f6'};
`;

const ConfigSection = styled.div`
  margin-top: 16px;
`;

const ConfigLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
`;

const ConfigValue = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 12px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  margin-bottom: 24px;
`;

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
  const [channels, setChannels] = useState<AssistantChannels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

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
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ChannelGrid>
        {/* Voice Channel */}
        <ChannelCard enabled={channels.voice?.enabled || false}>
          <ChannelHeader>
            <ChannelTitle>📞 Voice Channel</ChannelTitle>
            <ToggleSwitch>
              <input
                type="checkbox"
                checked={channels.voice?.enabled || false}
                onChange={() => toggleChannel('voice', channels.voice?.enabled || false)}
                disabled={updating === 'voice'}
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge enabled={channels.voice?.enabled || false}>
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

          <Button style={{ marginTop: '16px' }} onClick={() => onNavigate?.('prompt-config:voice')}>
            Configure Voice
          </Button>
        </ChannelCard>

        {/* Chat Channel */}
        <ChannelCard enabled={channels.chat?.enabled || false}>
          <ChannelHeader>
            <ChannelTitle>💬 Chat Channel</ChannelTitle>
            <ToggleSwitch>
              <input
                type="checkbox"
                checked={channels.chat?.enabled || false}
                onChange={() => toggleChannel('chat', channels.chat?.enabled || false)}
                disabled={updating === 'chat'}
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge enabled={channels.chat?.enabled || false}>
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

          <Button style={{ marginTop: '16px' }} onClick={() => onNavigate?.('prompt-config:chat')}>
            Configure Chat
          </Button>
        </ChannelCard>

        {/* SMS Channel */}
        <ChannelCard enabled={channels.sms?.enabled || false}>
          <ChannelHeader>
            <ChannelTitle>📱 SMS Channel</ChannelTitle>
            <ToggleSwitch>
              <input
                type="checkbox"
                checked={channels.sms?.enabled || false}
                disabled
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge enabled={false}>Coming Soon</StatusBadge>
          
          <ConfigSection>
            <ConfigValue style={{ color: '#9ca3af' }}>
              SMS channel will allow text-based conversations via SMS messaging.
            </ConfigValue>
          </ConfigSection>
        </ChannelCard>

        {/* WhatsApp Channel */}
        <ChannelCard enabled={channels.whatsapp?.enabled || false}>
          <ChannelHeader>
            <ChannelTitle>💚 WhatsApp Channel</ChannelTitle>
            <ToggleSwitch>
              <input
                type="checkbox"
                checked={channels.whatsapp?.enabled || false}
                disabled
              />
              <span />
            </ToggleSwitch>
          </ChannelHeader>

          <StatusBadge enabled={false}>Coming Soon</StatusBadge>

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
