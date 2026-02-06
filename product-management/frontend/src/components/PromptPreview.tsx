/**
 * PromptPreview Component (Phase 1.5)
 *
 * Real-time preview panel showing assembled 6-layer prompt with:
 * - Syntax-highlighted markdown preview
 * - Token count (OpenAI + Claude models)
 * - Word count and character count
 * - Copy to clipboard functionality
 * - Export as .txt or .md
 * - Variable placeholder validation
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import PromptPreviewService from '../services/promptPreview.service';
import { IPromptVersion } from '../services/promptApi';

// Styled Components
const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-left: 1px solid #333;
  overflow: hidden;
`;

const PreviewHeader = styled.div`
  padding: 16px;
  background: #252526;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PreviewTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PreviewActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  ${props => props.variant === 'primary' ? `
    background: #0e639c;
    color: #ffffff;
    &:hover {
      background: #1177bb;
    }
  ` : `
    background: #3c3c3c;
    color: #cccccc;
    &:hover {
      background: #4c4c4c;
    }
  `}

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PreviewContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &::-webkit-scrollbar {
    width: 12px;
  }

  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  &::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #4e4e4e;
  }
`;

const MetricsBar = styled.div`
  padding: 12px 16px;
  background: #252526;
  border-top: 1px solid #333;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
`;

const MetricCard = styled.div<{ status?: 'optimal' | 'high' | 'too_high' }>`
  padding: 8px 12px;
  background: #1e1e1e;
  border-radius: 6px;
  border-left: 3px solid ${props =>
    props.status === 'optimal' ? '#4ec9b0' :
    props.status === 'high' ? '#ce9178' :
    props.status === 'too_high' ? '#f48771' :
    '#3c3c3c'
  };
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
`;

const MetricSubtext = styled.div`
  font-size: 10px;
  color: #858585;
  margin-top: 2px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #858585;
  text-align: center;
  padding: 40px;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: 14px;
  line-height: 1.6;
`;

const VariableWarning = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(206, 145, 120, 0.1);
  border-left: 3px solid #ce9178;
  border-radius: 4px;
`;

const WarningTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #ce9178;
  margin-bottom: 6px;
`;

const WarningText = styled.div`
  font-size: 11px;
  color: #cccccc;
  line-height: 1.5;
`;

const VariableList = styled.div`
  margin-top: 8px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #4ec9b0;
`;

interface PromptPreviewProps {
  prompt: IPromptVersion;
  modelType?: 'gpt-4' | 'claude-3' | 'gpt-3.5';
}

const PromptPreview: React.FC<PromptPreviewProps> = ({
  prompt,
  modelType = 'gpt-4'
}) => {
  const [copied, setCopied] = useState(false);

  // Assemble prompt and calculate metrics
  const assembledPrompt = useMemo(() => {
    if (!prompt || !prompt.content) return '';
    return PromptPreviewService.assemblePrompt(prompt);
  }, [prompt]);

  const tokenCount = useMemo(() => {
    if (!assembledPrompt) return 0;
    return PromptPreviewService.countTokens(assembledPrompt, modelType);
  }, [assembledPrompt, modelType]);

  const wordCount = useMemo(() => {
    if (!assembledPrompt) return 0;
    return PromptPreviewService.wordCount(assembledPrompt);
  }, [assembledPrompt]);

  const characterCount = useMemo(() => {
    if (!assembledPrompt) return 0;
    return PromptPreviewService.characterCount(assembledPrompt);
  }, [assembledPrompt]);

  const tokenRecommendation = useMemo(() => {
    return PromptPreviewService.getTokenRecommendation(tokenCount);
  }, [tokenCount]);

  const variables = useMemo(() => {
    if (!assembledPrompt) return [];
    return PromptPreviewService.extractVariables(assembledPrompt);
  }, [assembledPrompt]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(assembledPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Export as file
  const handleExport = (format: 'txt' | 'md') => {
    const blob = new Blob([assembledPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.name || 'prompt'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Empty state
  if (!prompt || !prompt.content || !assembledPrompt) {
    return (
      <PreviewContainer>
        <PreviewHeader>
          <PreviewTitle>Prompt Preview</PreviewTitle>
        </PreviewHeader>
        <EmptyState>
          <EmptyIcon>📝</EmptyIcon>
          <EmptyText>
            Start filling in the prompt fields to see a preview of the assembled prompt.
          </EmptyText>
        </EmptyState>
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer>
      <PreviewHeader>
        <PreviewTitle>Final Prompt Preview</PreviewTitle>
        <PreviewActions>
          <ActionButton
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </ActionButton>
          <ActionButton
            onClick={() => handleExport('txt')}
            title="Export as .txt"
          >
            📄 .txt
          </ActionButton>
          <ActionButton
            onClick={() => handleExport('md')}
            title="Export as .md"
          >
            📄 .md
          </ActionButton>
        </PreviewActions>
      </PreviewHeader>

      <PreviewContent>
        {/* Variable warnings */}
        {variables.length > 0 && (
          <VariableWarning>
            <WarningTitle>⚠️ Variables Detected</WarningTitle>
            <WarningText>
              This prompt contains variables that will be replaced at runtime:
            </WarningText>
            <VariableList>
              {variables.map((v, i) => (
                <div key={i}>{'{{' + v + '}}'}</div>
              ))}
            </VariableList>
          </VariableWarning>
        )}

        {/* Syntax-highlighted preview */}
        <SyntaxHighlighter
          language="markdown"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '16px',
            background: '#1e1e1e',
            fontSize: '13px',
            lineHeight: '1.6',
            borderRadius: '6px'
          }}
          showLineNumbers={false}
          wrapLines={true}
          wrapLongLines={true}
        >
          {assembledPrompt}
        </SyntaxHighlighter>
      </PreviewContent>

      <MetricsBar>
        <MetricCard status={tokenRecommendation.status}>
          <MetricLabel>Token Count</MetricLabel>
          <MetricValue>{tokenCount.toLocaleString()}</MetricValue>
          <MetricSubtext>{tokenRecommendation.message}</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricLabel>Word Count</MetricLabel>
          <MetricValue>{wordCount.toLocaleString()}</MetricValue>
          <MetricSubtext>Approx. {Math.ceil(wordCount / 200)} min read</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricLabel>Characters</MetricLabel>
          <MetricValue>{characterCount.toLocaleString()}</MetricValue>
          <MetricSubtext>{variables.length} variable(s)</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricLabel>Model</MetricLabel>
          <MetricValue style={{ fontSize: '14px', textTransform: 'uppercase' }}>
            {modelType}
          </MetricValue>
          <MetricSubtext>Token counter</MetricSubtext>
        </MetricCard>
      </MetricsBar>
    </PreviewContainer>
  );
};

export default PromptPreview;
