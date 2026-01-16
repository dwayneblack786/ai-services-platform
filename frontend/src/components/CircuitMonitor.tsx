import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

interface CircuitStats {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: number | null;
  nextRetryTime: number | null;
}

interface CircuitMonitorProps {
  compact?: boolean;
  showDetails?: boolean;
}

const CircuitMonitor: React.FC<CircuitMonitorProps> = ({ 
  compact = false, 
  showDetails = true 
}) => {
  const [stats, setStats] = useState<CircuitStats | null>(null);
  const [showFullStats, setShowFullStats] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateStats = async () => {
    try {
      // Call backend circuit stats API
      const response = await apiClient.get('/api/circuit/stats');
      const backendStats = response.data.stats;
      
      setStats({
        state: backendStats.state as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
        failureCount: backendStats.failureCount,
        successCount: backendStats.successCount,
        totalRequests: backendStats.totalRequests,
        lastFailureTime: backendStats.lastFailureTime,
        nextRetryTime: backendStats.nextAttemptTime
      });
    } catch (error) {
      console.error('[CircuitMonitor] Failed to fetch circuit stats from backend:', error);
      // Fallback to frontend circuit breaker state
      const circuitState = apiClient.getCircuitState();
      const circuitStats = apiClient.getStats();
      
      setStats({
        state: circuitState as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
        failureCount: circuitStats.failureCount,
        successCount: circuitStats.successCount,
        totalRequests: circuitStats.totalRequests,
        lastFailureTime: circuitStats.lastFailureTime,
        nextRetryTime: null
      });
    }
  };

  useEffect(() => {
    // Update stats every 2 seconds
    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const isHealthy = stats.state === 'CLOSED';
  const isRecovering = stats.state === 'HALF_OPEN';
  const isDegraded = stats.state === 'OPEN';

  const successRate = stats.totalRequests > 0 
    ? ((stats.successCount / stats.totalRequests) * 100).toFixed(1)
    : '100.0';

  if (compact) {
    const tooltipText = isHealthy 
      ? `✅ All systems operational\nCircuit: CLOSED\nSuccess Rate: ${successRate}%\nAll API requests are flowing normally`
      : isRecovering 
      ? `🔄 Testing service recovery\nCircuit: HALF_OPEN\nSuccess Rate: ${successRate}%\nAllowing test requests to check if service is back online`
      : `⚠️ Service temporarily unavailable\nCircuit: OPEN\nSuccess Rate: ${successRate}%\nProtecting system from cascading failures. Will auto-retry shortly.`;

    return (
      <div style={styles.compactWrapper}>
        <div 
          style={{...styles.compactContainer, cursor: 'pointer'}}
          title={tooltipText}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div style={styles.compactStatus(isHealthy, isRecovering, isDegraded)}>
            <span style={styles.statusDot(isHealthy, isRecovering, isDegraded)} />
            <span style={styles.statusText}>
              {isHealthy && 'Service Healthy'}
              {isRecovering && 'Service Recovering'}
              {isDegraded && 'Service Degraded'}
            </span>
          </div>
        </div>
        
        {isExpanded && (
          <div style={styles.expandedDropdown}>
            <div style={styles.dropdownHeader}>
              <h4 style={styles.dropdownTitle}>Circuit Breaker Status</h4>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.dropdownStats}>
              <div style={styles.dropdownStatRow}>
                <span style={styles.dropdownLabel}>State:</span>
                <span style={styles.dropdownValue(isDegraded)}>{stats.state}</span>
              </div>
              <div style={styles.dropdownStatRow}>
                <span style={styles.dropdownLabel}>Success Rate:</span>
                <span style={styles.dropdownValue(false)}>{successRate}%</span>
              </div>
              <div style={styles.dropdownStatRow}>
                <span style={styles.dropdownLabel}>Total Requests:</span>
                <span style={styles.dropdownValue(false)}>{stats.totalRequests}</span>
              </div>
              <div style={styles.dropdownStatRow}>
                <span style={styles.dropdownLabel}>Failures:</span>
                <span style={styles.dropdownValue(stats.failureCount > 0)}>{stats.failureCount}</span>
              </div>
              <div style={styles.dropdownStatRow}>
                <span style={styles.dropdownLabel}>Successes:</span>
                <span style={styles.dropdownValue(false)}>{stats.successCount}</span>
              </div>
              {stats.lastFailureTime && (
                <div style={styles.dropdownStatRow}>
                  <span style={styles.dropdownLabel}>Last Failure:</span>
                  <span style={{...styles.dropdownValue(false), fontSize: '11px'}}>
                    {new Date(stats.lastFailureTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  // Call backend circuit reset API
                  await apiClient.post('/api/circuit/reset');
                  console.log('[CircuitMonitor] Circuit breaker reset successfully');
                } catch (error) {
                  console.error('[CircuitMonitor] Failed to reset circuit breaker:', error);
                  // Fallback to frontend reset
                  apiClient.resetCircuit();
                }
                // Force immediate update
                setTimeout(() => updateStats(), 0);
              }}
              style={{
                ...styles.dropdownResetButton,
                backgroundColor: isDegraded ? '#ffc107' : '#6c757d'
              }}
              title={isDegraded ? "Manually reset circuit breaker to retry service" : "Reset circuit breaker stats"}
            >
              {isDegraded ? '🔧 Reset Circuit' : '↻ Clear Stats'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Circuit Breaker Status</h3>
        <button 
          onClick={() => setShowFullStats(!showFullStats)}
          style={styles.toggleButton}
        >
          {showFullStats ? '▼' : '▶'} Details
        </button>
      </div>

      <div style={styles.statusCard(isHealthy, isRecovering, isDegraded)}>
        <div style={styles.statusHeader}>
          <span 
            style={styles.statusIcon}
            title={
              isHealthy 
                ? 'Healthy: Circuit is CLOSED, all requests flowing normally' 
                : isRecovering 
                ? 'Recovering: Circuit is HALF_OPEN, testing service availability' 
                : 'Degraded: Circuit is OPEN, preventing cascading failures'
            }
          >
            {isHealthy && '✅'}
            {isRecovering && '🔄'}
            {isDegraded && '⚠️'}
          </span>
          <div>
            <div 
              style={styles.statusLabel}
              title={`Circuit Breaker State: ${stats.state}`}
            >
              {isHealthy && 'HEALTHY'}
              {isRecovering && 'RECOVERING'}
              {isDegraded && 'DEGRADED'}
            </div>
            <div style={styles.statusSubtext}>
              {isHealthy && 'All systems operational'}
              {isRecovering && 'Testing service recovery'}
              {isDegraded && 'Service temporarily unavailable'}
            </div>
          </div>
        </div>

        {showDetails && (
          <div style={styles.statsGrid}>
            <div style={styles.statCard} title="Percentage of successful API calls out of total requests">
              <div style={styles.statLabel}>Success Rate</div>
              <div style={styles.statValue}>{successRate}%</div>
            </div>
            <div style={styles.statCard} title="Total number of API requests made through circuit breaker">
              <div style={styles.statLabel}>Total Requests</div>
              <div style={styles.statValue}>{stats.totalRequests}</div>
            </div>
            <div style={styles.statCard} title="Number of failed requests that triggered circuit breaker logic">
              <div style={styles.statLabel}>Failures</div>
              <div style={styles.statValue(stats.failureCount > 0)}>
                {stats.failureCount}
              </div>
            </div>
            <div style={styles.statCard} title="Number of successful API calls completed">
              <div style={styles.statLabel}>Successes</div>
              <div style={styles.statValue(false)}>
                {stats.successCount}
              </div>
            </div>
          </div>
        )}

        {showFullStats && (
          <div style={styles.detailsSection}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Circuit State:</span>
              <span style={styles.detailValue(isDegraded)}>{stats.state}</span>
            </div>
            {stats.lastFailureTime && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Last Failure:</span>
                <span style={styles.detailValue(false)}>
                  {new Date(stats.lastFailureTime).toLocaleString()}
                </span>
              </div>
            )}
            {stats.nextRetryTime && isDegraded && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Next Retry:</span>
                <span style={styles.detailValue(false)}>
                  {Math.max(0, Math.ceil((stats.nextRetryTime - Date.now()) / 1000))}s
                </span>
              </div>
            )}
          </div>
        )}

        {isDegraded && (
          <div style={styles.actionSection}>
            <button 
              onClick={() => {
                apiClient.resetCircuit();
                alert('Circuit breaker has been manually reset. Service will be retried on next request.');
              }}
              style={styles.resetButton}
              title="Manually reset the circuit breaker to immediately retry the service (use when you know the issue is resolved)"
            >
              🔧 Manual Reset
            </button>
          </div>
        )}
      </div>

      {isDegraded && (
        <div style={styles.warningBox}>
          <strong>⚠️ Service Degraded</strong>
          <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
            The circuit breaker has opened due to repeated failures. 
            This protects the system from cascading failures. 
            The service will automatically retry shortly.
          </p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#333',
    margin: 0
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px'
  },
  statusCard: (healthy: boolean, recovering: boolean, degraded: boolean) => ({
    padding: '20px',
    borderRadius: '8px',
    backgroundColor: healthy ? '#d4edda' : recovering ? '#fff3cd' : '#f8d7da',
    border: `2px solid ${healthy ? '#28a745' : recovering ? '#ffc107' : '#dc3545'}`
  }),
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px'
  },
  statusIcon: {
    fontSize: '32px'
  },
  statusLabel: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#333'
  },
  statusSubtext: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginTop: '16px'
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'center' as const
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
    textTransform: 'uppercase' as const
  },
  statValue: (isError: boolean = false) => ({
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: isError ? '#dc3545' : '#28a745'
  }),
  detailsSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px'
  },
  detailLabel: {
    fontWeight: 'bold' as const,
    color: '#555'
  },
  detailValue: (isError: boolean = false) => ({
    color: isError ? '#dc3545' : '#666',
    fontFamily: 'monospace' as const
  }),
  actionSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#ffc107',
    border: 'none',
    borderRadius: '6px',
    color: '#333',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    fontSize: '14px'
  },
  warningBox: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    border: '1px solid #ffc107',
    color: '#856404'
  },
  compactWrapper: {
    position: 'relative' as const,
    display: 'inline-block'
  },
  compactContainer: {
    display: 'inline-block'
  },
  compactStatus: (healthy: boolean, recovering: boolean, degraded: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: healthy ? '#d4edda' : recovering ? '#fff3cd' : '#f8d7da',
    border: `1px solid ${healthy ? '#28a745' : recovering ? '#ffc107' : '#dc3545'}`,
    transition: 'all 0.2s ease',
    ':hover': {
      opacity: 0.9
    }
  }),
  statusDot: (healthy: boolean, recovering: boolean, degraded: boolean) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: healthy ? '#28a745' : recovering ? '#ffc107' : '#dc3545',
    display: 'inline-block'
  }),
  statusText: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#333'
  },
  expandedDropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: '0',
    marginTop: '8px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '16px',
    minWidth: '280px',
    zIndex: 1000,
    border: '1px solid #ddd'
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee'
  },
  dropdownTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#333'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    padding: '0 4px',
    lineHeight: '1'
  },
  dropdownStats: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  dropdownStatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px'
  },
  dropdownLabel: {
    color: '#666',
    fontWeight: '500' as const
  },
  dropdownValue: (isError: boolean = false) => ({
    color: isError ? '#dc3545' : '#333',
    fontWeight: 'bold' as const,
    fontFamily: 'monospace' as const
  }),
  dropdownResetButton: {
    marginTop: '12px',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#ffc107',
    border: 'none',
    borderRadius: '6px',
    color: '#ccc',
    fontWeight: 'bold' as const,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  }
};

export default CircuitMonitor;
