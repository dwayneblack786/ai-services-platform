/**
 * PromptDashboardCard Component
 * Professional dashboard card with statistics, graphs, and analytics
 */

import React from 'react';
import styled from '@emotion/styled';
import VersionStatus from './VersionStatus';

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const TitleSection = styled.div`
  flex: 1;
`;

const ChannelIcon = styled.span`
  font-size: 24px;
  margin-right: 10px;
`;

const PromptTitle = styled.h3`
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 700;
  color: #222;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PromptDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  max-height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricValue = styled.div<{ color?: string }>`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.color || '#222'};
  margin-bottom: 4px;
`;

const MetricLabel = styled.div`
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const ScoreBar = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
`;

const ScoreBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
`;

const ScoreBarTrack = styled.div`
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const ScoreBarFill = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.color};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ThresholdMarker = styled.div<{ position: number }>`
  position: absolute;
  left: ${props => props.position}%;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: #ff9800;

  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -3px;
    width: 8px;
    height: 8px;
    background: #ff9800;
    border-radius: 50%;
  }
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const UpdatedText = styled.span`
  font-size: 11px;
  color: #999;
  font-style: italic;
`;

const CategoryBadge = styled.span`
  padding: 4px 10px;
  border-radius: 12px;
  fontSize: 11px;
  font-weight: 500;
  background: #f3e5f5;
  color: #6a1b9a;
`;

const DeletedBadge = styled.span`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #ffebee;
  color: #c62828;
  text-transform: uppercase;
`;

interface PromptDashboardCardProps {
  name: string;
  description?: string;
  channelType: 'voice' | 'chat' | 'sms' | 'whatsapp' | 'email';
  state: 'draft' | 'testing' | 'staging' | 'production' | 'archived';
  version?: number;
  category?: string;
  updatedAt?: string | Date;
  isDeleted?: boolean;
  metrics?: {
    totalUses?: number;
    avgLatency?: number;
    errorRate?: number;
  };
  lastScore?: number;
  scoreThreshold?: number;
  onClick?: () => void;
}

const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const getChannelIcon = (channelType: string): string => {
  switch (channelType) {
    case 'voice': return '📞';
    case 'chat': return '💬';
    case 'sms': return '📱';
    case 'whatsapp': return '💚';
    case 'email': return '📧';
    default: return '📝';
  }
};

const getChannelLabel = (channelType: string): string => {
  switch (channelType) {
    case 'voice': return 'Voice';
    case 'chat': return 'Chat';
    case 'sms': return 'SMS';
    case 'whatsapp': return 'WhatsApp';
    case 'email': return 'Email';
    default: return channelType;
  }
};

const getScoreColor = (score: number, threshold: number): string => {
  if (score >= threshold) return '#4caf50';
  if (score >= threshold * 0.8) return '#ff9800';
  return '#f44336';
};

export const PromptDashboardCard: React.FC<PromptDashboardCardProps> = ({
  name,
  description,
  channelType,
  state,
  version,
  category,
  updatedAt,
  isDeleted,
  metrics,
  lastScore,
  scoreThreshold = 70,
  onClick
}) => {
  const hasMetrics = metrics && (metrics.totalUses || metrics.avgLatency || metrics.errorRate);
  const hasScore = lastScore !== undefined && lastScore !== null;

  return (
    <Card onClick={onClick} style={{ opacity: isDeleted ? 0.6 : 1 }}>
      <CardHeader>
        <TitleSection>
          <PromptTitle>
            <ChannelIcon>{getChannelIcon(channelType)}</ChannelIcon>
            <span>{name || `${getChannelLabel(channelType)} Prompt`}</span>
          </PromptTitle>
          {description && (
            <PromptDescription>{description}</PromptDescription>
          )}
        </TitleSection>
      </CardHeader>

      <StatusRow>
        <VersionStatus
          state={state}
          version={version}
          showVersion={true}
          showUpdated={false}
        />
        {category && <CategoryBadge>{category}</CategoryBadge>}
        {isDeleted && <DeletedBadge>Deleted</DeletedBadge>}
      </StatusRow>

      {hasMetrics && (
        <MetricsGrid>
          <MetricItem>
            <MetricValue color="#2196f3">
              {formatNumber(metrics?.totalUses || 0)}
            </MetricValue>
            <MetricLabel>Total Uses</MetricLabel>
          </MetricItem>
          <MetricItem>
            <MetricValue color="#4caf50">
              {metrics?.avgLatency ? `${metrics.avgLatency.toFixed(0)}ms` : 'N/A'}
            </MetricValue>
            <MetricLabel>Avg Latency</MetricLabel>
          </MetricItem>
          <MetricItem>
            <MetricValue color={metrics?.errorRate && metrics.errorRate > 5 ? '#f44336' : '#4caf50'}>
              {metrics?.errorRate !== undefined ? `${metrics.errorRate.toFixed(1)}%` : 'N/A'}
            </MetricValue>
            <MetricLabel>Error Rate</MetricLabel>
          </MetricItem>
        </MetricsGrid>
      )}

      {hasScore && (
        <ScoreBar>
          <ScoreBarLabel>
            <span style={{ fontWeight: 600 }}>Analysis Score</span>
            <span style={{ fontWeight: 700, color: getScoreColor(lastScore, scoreThreshold) }}>
              {lastScore.toFixed(1)}%
            </span>
          </ScoreBarLabel>
          <ScoreBarTrack>
            <ScoreBarFill
              width={lastScore}
              color={getScoreColor(lastScore, scoreThreshold)}
            />
            <ThresholdMarker position={scoreThreshold} />
          </ScoreBarTrack>
        </ScoreBar>
      )}

      {updatedAt && (
        <UpdatedText style={{ display: 'block', marginTop: hasScore || hasMetrics ? '12px' : '8px' }}>
          Updated {formatDate(updatedAt)}
        </UpdatedText>
      )}
    </Card>
  );
};

export default PromptDashboardCard;
