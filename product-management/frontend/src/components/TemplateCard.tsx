/**
 * TemplateCard Component (Phase 0.5)
 *
 * Displays a single template card with channel type, description, and preview.
 * Shows template icon, channel badge, and key features.
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { IPromptVersion } from '../services/promptApi';

// Styled Components
const Card = styled.div`
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: #1976d2;
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
    transform: translateY(-4px);
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const IconAndTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Icon = styled.div`
  font-size: 40px;
  line-height: 1;
`;

const TitleSection = styled.div`
  flex: 1;
`;

const TemplateName = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const ChannelBadge = styled.div<{ channel: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 4px;

  ${props => {
    switch (props.channel) {
      case 'voice': return 'background: #e3f2fd; color: #1976d2;';
      case 'chat': return 'background: #f3e5f5; color: #7b1fa2;';
      case 'sms': return 'background: #fff3e0; color: #f57c00;';
      case 'whatsapp': return 'background: #e8f5e9; color: #388e3c;';
      case 'email': return 'background: #fce4ec; color: #c2185b;';
      default: return 'background: #f5f5f5; color: #757575;';
    }
  }}
`;

const Description = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
  line-height: 1.6;
`;

const FeaturesSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const Feature = styled.div`
  font-size: 13px;
  color: #555;
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  &:before {
    content: '✓';
    color: #4caf50;
    font-weight: bold;
  }
`;

const PreviewBox = styled.div`
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #666;
  font-style: italic;
  border-left: 3px solid #1976d2;
  max-height: 60px;
  overflow: hidden;
  position: relative;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(transparent, #f8f9fa);
  }
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1565c0;
  }

  &:active {
    background: #0d47a1;
  }
`;

const TooltipBox = styled.div<{ show: boolean }>`
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: ${props => props.show ? 1 : 0};
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;

  &:after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid rgba(0, 0, 0, 0.85);
  }
`;

interface TemplateCardProps {
  template: IPromptVersion;
  onSelect: (template: IPromptVersion) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Extract key features from template content
  const tone = template.content.persona?.tone || 'Professional';
  const greeting = template.content.conversationBehavior?.greeting || '';
  const allowedActionsCount = template.content.persona?.allowedActions?.length || 0;

  const channelIcon = template.channelType === 'voice' ? '📞' : '💬';

  return (
    <Card
      onClick={() => onSelect(template)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <TooltipBox show={showTooltip}>
        Click to use this template
      </TooltipBox>

      <Header>
        <IconAndTitle>
          <Icon>{template.icon || channelIcon}</Icon>
          <TitleSection>
            <TemplateName>{template.name}</TemplateName>
            <ChannelBadge channel={template.channelType}>
              {template.channelType} Channel
            </ChannelBadge>
          </TitleSection>
        </IconAndTitle>
      </Header>

      <Description>
        {template.templateDescription || template.description || 'Pre-configured template for your industry'}
      </Description>

      <FeaturesSection>
        <SectionTitle>Key Features</SectionTitle>
        <Feature>Tone: {tone}</Feature>
        <Feature>{allowedActionsCount} pre-configured actions</Feature>
        <Feature>Industry-specific compliance rules</Feature>
        <Feature>Fully customizable after selection</Feature>
      </FeaturesSection>

      {greeting && (
        <>
          <SectionTitle>Sample Greeting</SectionTitle>
          <PreviewBox>
            "{greeting}"
          </PreviewBox>
        </>
      )}

      <ActionButton>
        Use This Template
      </ActionButton>
    </Card>
  );
};

export default TemplateCard;
