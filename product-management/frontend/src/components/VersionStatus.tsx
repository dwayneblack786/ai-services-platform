/**
 * VersionStatus Component - Reusable status badge
 * Displays state, version number, and last updated with tooltips
 */

import React from 'react';
import styled from '@emotion/styled';

const StatusBadge = styled.div<{ state: string }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: help;

  ${props => {
    switch (props.state) {
      case 'draft': return 'background: #fff3e0; color: #e65100;';
      case 'testing': return 'background: #e3f2fd; color: #0277bd;';
      case 'staging': return 'background: #f3e5f5; color: #6a1b9a;';
      case 'production': return 'background: #e8f5e9; color: #2e7d32;';
      case 'archived': return 'background: #f5f5f5; color: #757575;';
      default: return 'background: #f5f5f5; color: #757575;';
    }
  }}
`;

const VersionBadge = styled.span`
  font-size: 11px;
  color: #999;
  margin-left: 8px;
  font-weight: 500;
`;

const UpdatedText = styled.span`
  font-size: 11px;
  color: #666;
  margin-left: 8px;
  font-style: italic;
`;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;

  &:hover .tooltip {
    opacity: 1;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 12px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
  }
`;

interface VersionStatusProps {
  state: 'draft' | 'testing' | 'staging' | 'production' | 'archived';
  version?: number;
  lastUpdated?: string | Date;
  showVersion?: boolean;
  showUpdated?: boolean;
}

const getStateDescription = (state: string): string => {
  switch (state) {
    case 'draft': return 'Draft - Not yet tested or deployed';
    case 'testing': return 'Testing - Undergoing analysis and validation';
    case 'staging': return 'Staging - Pre-production environment';
    case 'production': return 'Production - Live and active';
    case 'archived': return 'Archived - Retired from use';
    default: return state;
  }
};

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

export const VersionStatus: React.FC<VersionStatusProps> = ({
  state,
  version,
  lastUpdated,
  showVersion = true,
  showUpdated = false
}) => {
  return (
    <TooltipContainer>
      <StatusBadge state={state}>
        {state}
      </StatusBadge>
      {showVersion && version && (
        <VersionBadge>v{version}</VersionBadge>
      )}
      {showUpdated && lastUpdated && (
        <UpdatedText>{formatDate(lastUpdated)}</UpdatedText>
      )}
      <Tooltip className="tooltip">{getStateDescription(state)}</Tooltip>
    </TooltipContainer>
  );
};

export default VersionStatus;
