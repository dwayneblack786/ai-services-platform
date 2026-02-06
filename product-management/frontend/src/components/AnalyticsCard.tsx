/**
 * AnalyticsCard Component - Display metrics and analysis results
 * Shows scoring, metrics, and analysis status
 */

import React from 'react';
import styled from '@emotion/styled';

const Card = styled.div`
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 8px;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  font-weight: 500;
`;

const MetricValue = styled.div<{ highlight?: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.highlight ? '#2e7d32' : '#333'};
`;

const ScoreBadge = styled.div<{ score: number; threshold: number }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: ${props => props.score >= props.threshold ? '#e8f5e9' : '#ffebee'};
  color: ${props => props.score >= props.threshold ? '#2e7d32' : '#c62828'};
`;

const PendingState = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #f5f5f5;
  color: #757575;
  font-style: italic;
`;

const TrendIndicator = styled.span<{ trend: 'up' | 'down' | 'stable' }>`
  margin-left: 6px;
  font-size: 14px;
  color: ${props =>
    props.trend === 'up' ? '#2e7d32' :
    props.trend === 'down' ? '#c62828' :
    '#757575'
  };
`;

const LastAnalyzed = styled.div`
  font-size: 11px;
  color: #999;
  margin-top: 8px;
  font-style: italic;
`;

interface AnalyticsCardProps {
  lastScore?: number;
  threshold?: number;
  metrics?: {
    totalUses?: number;
    avgLatency?: number;
    errorRate?: number;
  };
  lastAnalyzedAt?: string | Date;
  compact?: boolean;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return 'Less than an hour ago';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
};

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  lastScore,
  threshold = 70,
  metrics,
  lastAnalyzedAt,
  compact = false
}) => {
  const hasData = lastScore !== undefined || (metrics && Object.keys(metrics).length > 0);

  if (!hasData) {
    return (
      <Card>
        <PendingState>Analysis pending</PendingState>
      </Card>
    );
  }

  return (
    <Card>
      {lastScore !== undefined && (
        <div>
          <ScoreBadge score={lastScore} threshold={threshold}>
            Score: {lastScore}%
            {lastScore >= threshold && <span style={{ marginLeft: '6px' }}>✓</span>}
          </ScoreBadge>
        </div>
      )}

      {!compact && metrics && (
        <MetricsGrid>
          {metrics.totalUses !== undefined && (
            <MetricItem>
              <MetricLabel>Uses</MetricLabel>
              <MetricValue>{formatNumber(metrics.totalUses)}</MetricValue>
            </MetricItem>
          )}
          {metrics.avgLatency !== undefined && (
            <MetricItem>
              <MetricLabel>Latency</MetricLabel>
              <MetricValue>{formatLatency(metrics.avgLatency)}</MetricValue>
            </MetricItem>
          )}
          {metrics.errorRate !== undefined && (
            <MetricItem>
              <MetricLabel>Error Rate</MetricLabel>
              <MetricValue highlight={metrics.errorRate < 0.01}>
                {(metrics.errorRate * 100).toFixed(2)}%
              </MetricValue>
            </MetricItem>
          )}
        </MetricsGrid>
      )}

      {lastAnalyzedAt && (
        <LastAnalyzed>
          Last analyzed {formatDate(lastAnalyzedAt)}
        </LastAnalyzed>
      )}
    </Card>
  );
};

export default AnalyticsCard;
