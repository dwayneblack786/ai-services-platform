import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

// ---------------------------------------------------------------------------
// Types (mirror backend IPromptTestResult)
// ---------------------------------------------------------------------------
interface QualityTests {
  clarityScore: number;
  completenessScore: number;
  ambiguityDetected: boolean;
  ambiguousTerms: string[];
  toneConsistency: {
    detected: string;
    consistencyScore: number;
    inconsistencies: string[];
  };
  variablePlaceholders: {
    valid: string[];
    invalid: string[];
    missing: string[];
  };
}

interface SafetyTests {
  toxicContentDetected: boolean;
  toxicityScore: number;
  toxicExamples: string[];
  biasDetected: boolean;
  biasTypes: string[];
  biasExamples: Array<{ type: string; text: string; severity: 'low' | 'medium' | 'high' }>;
  piiLeakageRisk: boolean;
  piiExamples: string[];
  complianceViolations: Array<{ rule: string; severity: string; description: string }>;
  prohibitedTopics: string[];
}

interface PerformanceTests {
  tokenCount: { system: number; user: number; total: number; recommendation: string };
  estimatedLatency: number;
  estimatedCost: { perRequest: number; per1000Requests: number; currency: string };
  modelCompatibility: Array<{ model: string; compatible: boolean; issues: string[] }>;
}

interface ImprovementSuggestion {
  category: string;
  priority: string;
  current: string;
  suggested: string;
  reason: string;
  example?: string;
  acceptedByUser: boolean;
  appliedAt?: string;
}

interface TestResult {
  _id: string;
  promptVersionId: string;
  executedAt: string;
  executionDuration: number;
  qualityTests?: QualityTests;
  safetyTests?: SafetyTests;
  performanceTests?: PerformanceTests;
  improvementSuggestions?: ImprovementSuggestion[];
  overallScore: number;
  passed: boolean;
  criticalIssues: number;
  warnings: number;
  recommendations: number;
  blocksPromotion: boolean;
  blockingReasons: string[];
}

interface TestResultsViewerProps {
  promptVersionId: string;
}

// ---------------------------------------------------------------------------
// Sub-components: score ring, section panels
// ---------------------------------------------------------------------------
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 72 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  const color = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#f44336';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e0e0e0" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={progress}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px`, fill: color, fontWeight: 700, fontSize: '18px' }}
      >
        {score}
      </text>
    </svg>
  );
};

const SectionHeader: React.FC<{ icon: string; title: string; score?: number; status?: 'pass' | 'warn' | 'fail' }> = ({ icon, title, score, status }) => {
  const statusColors: Record<string, string> = { pass: '#4caf50', warn: '#ff9800', fail: '#f44336' };
  const statusBg: Record<string, string> = { pass: '#e8f5e9', warn: '#fff3e0', fail: '#ffebee' };
  const statusLabel: Record<string, string> = { pass: 'Pass', warn: 'Warning', fail: 'Fail' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{icon}</span> {title}
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {score !== undefined && <span style={{ fontSize: '14px', color: '#666' }}>{score}%</span>}
        {status && (
          <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: statusColors[status], background: statusBg[status] }}>
            {statusLabel[status]}
          </span>
        )}
      </div>
    </div>
  );
};

const PillTag: React.FC<{ children: React.ReactNode; color?: string; bg?: string }> = ({ children, color = '#555', bg = '#f5f5f5' }) => (
  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', color, background: bg, margin: '2px' }}>
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const TestResultsViewer: React.FC<TestResultsViewerProps> = ({ promptVersionId }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!promptVersionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/pms/prompt-testing/${promptVersionId}/test-results`);
      setResults(res.data);
      if (res.data.length > 0 && !selectedResultId) {
        setSelectedResultId(res.data[0]._id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch test results');
    } finally {
      setLoading(false);
    }
  }, [promptVersionId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleRunAnalysis = async () => {
    if (!promptVersionId) return;
    try {
      setRunning(true);
      setError(null);
      const res = await apiClient.post(`/api/pms/prompt-testing/${promptVersionId}/test`);
      // Prepend new result
      setResults(prev => [res.data, ...prev]);
      setSelectedResultId(res.data._id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to run analysis');
    } finally {
      setRunning(false);
    }
  };

  const handleAcceptSuggestion = async (resultId: string, index: number) => {
    try {
      setError(null);
      const res = await apiClient.post(`/api/pms/prompt-testing/results/${resultId}/suggestions/${index}/accept`);
      // Update local state with returned testResult
      setResults(prev => prev.map(r => r._id === resultId ? res.data.testResult : r));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept suggestion');
    }
  };

  const current = results.find(r => r._id === selectedResultId) ?? null;

  // ---------------------------------------------------------------------------
  // Render: header + trigger
  // ---------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Header row: Run Analysis button + result selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={handleRunAnalysis}
          disabled={running || loading}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none',
            background: running ? '#e3f2fd' : '#1976d2', color: running ? '#1976d2' : 'white',
            fontSize: '14px', fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <span>{running ? '⟳' : '🔍'}</span>
          {running ? 'Running Analysis…' : 'Run Analysis'}
        </button>

        {results.length > 1 && (
          <select
            value={selectedResultId ?? ''}
            onChange={(e) => setSelectedResultId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', color: '#555', background: 'white' }}
          >
            {results.map((r) => (
              <option key={r._id} value={r._id}>
                {new Date(r.executedAt).toLocaleString()} — Score: {r.overallScore}%
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#ffebee', borderRadius: '8px', color: '#c62828', fontSize: '14px', marginBottom: '16px', border: '1px solid #ef5350' }}>
          {error}
        </div>
      )}

      {loading && !current && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading…</div>
      )}

      {!loading && results.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#fafafa', borderRadius: '12px', border: '1px dashed #ddd' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#555' }}>No analysis results yet.</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>Click <strong>Run Analysis</strong> to evaluate this prompt for quality, safety, and performance.</p>
        </div>
      )}

      {/* ---------------------------------------------------------------------------
          Main result view
      --------------------------------------------------------------------------- */}
      {current && (
        <>
          {/* Overall score strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '24px', padding: '20px 24px',
            background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px'
          }}>
            <ScoreRing score={current.overallScore} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>Overall Score</span>
                <span style={{
                  padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                  background: current.passed ? '#e8f5e9' : '#ffebee',
                  color: current.passed ? '#2e7d32' : '#c62828'
                }}>
                  {current.passed ? 'Passed' : 'Needs Attention'}
                </span>
                {current.blocksPromotion && (
                  <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#fff3e0', color: '#e65100' }}>
                    Blocks Promotion
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#666' }}>
                {current.criticalIssues > 0 && <span style={{ color: '#c62828', fontWeight: 600 }}>{current.criticalIssues} critical</span>}
                {current.warnings > 0 && <span style={{ color: '#e65100' }}>{current.warnings} warning{current.warnings !== 1 ? 's' : ''}</span>}
                {current.recommendations > 0 && <span>{current.recommendations} recommendation{current.recommendations !== 1 ? 's' : ''}</span>}
                <span style={{ marginLeft: 'auto' }}>Ran {new Date(current.executedAt).toLocaleString()} ({current.executionDuration}ms)</span>
              </div>
            </div>
          </div>

          {/* Blocking reasons */}
          {current.blockingReasons.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: '#e65100' }}>Blocking Reasons</p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#bf360c' }}>
                {current.blockingReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* ---------------------------------------------------------------------------
              Quality panel
          --------------------------------------------------------------------------- */}
          {current.qualityTests && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '20px 24px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <SectionHeader
                icon="📝"
                title="Quality"
                score={Math.round((current.qualityTests.clarityScore + current.qualityTests.completenessScore) / 2)}
                status={current.qualityTests.clarityScore >= 70 && current.qualityTests.completenessScore >= 70 ? 'pass' : current.qualityTests.clarityScore >= 50 ? 'warn' : 'fail'}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Clarity</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: current.qualityTests.clarityScore >= 70 ? '#4caf50' : '#f44336' }}>{current.qualityTests.clarityScore}%</div>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Completeness</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: current.qualityTests.completenessScore >= 70 ? '#4caf50' : '#f44336' }}>{current.qualityTests.completenessScore}%</div>
                </div>
              </div>
              {current.qualityTests.ambiguityDetected && current.qualityTests.ambiguousTerms.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Ambiguous terms detected:</div>
                  <div>{current.qualityTests.ambiguousTerms.map((t, i) => <PillTag key={i} color="#c62828" bg="#ffebee">{t}</PillTag>)}</div>
                </div>
              )}
              {current.qualityTests.toneConsistency && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#666' }}>
                  <span><strong>Tone:</strong> {current.qualityTests.toneConsistency.detected}</span>
                  <span><strong>Consistency:</strong> {current.qualityTests.toneConsistency.consistencyScore}%</span>
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------------------
              Safety panel
          --------------------------------------------------------------------------- */}
          {current.safetyTests && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '20px 24px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <SectionHeader
                icon="🛡️"
                title="Safety"
                score={100 - current.safetyTests.toxicityScore}
                status={current.safetyTests.toxicContentDetected || current.safetyTests.biasDetected || current.safetyTests.piiLeakageRisk ? 'fail' : 'pass'}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PillTag color={current.safetyTests.toxicContentDetected ? '#c62828' : '#2e7d32'} bg={current.safetyTests.toxicContentDetected ? '#ffebee' : '#e8f5e9'}>
                  {current.safetyTests.toxicContentDetected ? '⚠ Toxicity detected' : '✓ No toxicity'}
                </PillTag>
                <PillTag color={current.safetyTests.biasDetected ? '#c62828' : '#2e7d32'} bg={current.safetyTests.biasDetected ? '#ffebee' : '#e8f5e9'}>
                  {current.safetyTests.biasDetected ? '⚠ Bias detected' : '✓ No bias'}
                </PillTag>
                <PillTag color={current.safetyTests.piiLeakageRisk ? '#c62828' : '#2e7d32'} bg={current.safetyTests.piiLeakageRisk ? '#ffebee' : '#e8f5e9'}>
                  {current.safetyTests.piiLeakageRisk ? '⚠ PII risk' : '✓ No PII risk'}
                </PillTag>
              </div>

              {current.safetyTests.toxicExamples.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#c62828', fontWeight: 600, marginBottom: '4px' }}>Toxic content examples:</div>
                  {current.safetyTests.toxicExamples.map((ex, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#555', background: '#ffebee', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', borderLeft: '3px solid #f44336' }}>"{ex}"</div>
                  ))}
                </div>
              )}

              {current.safetyTests.biasExamples.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#c62828', fontWeight: 600, marginBottom: '4px' }}>Bias examples:</div>
                  {current.safetyTests.biasExamples.map((ex, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#555', background: '#fff3e0', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', borderLeft: '3px solid #ff9800' }}>
                      <strong style={{ textTransform: 'capitalize' }}>{ex.type}</strong> ({ex.severity}): "{ex.text}"
                    </div>
                  ))}
                </div>
              )}

              {current.safetyTests.piiExamples.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#c62828', fontWeight: 600, marginBottom: '4px' }}>PII detected:</div>
                  <div>{current.safetyTests.piiExamples.map((p, i) => <PillTag key={i} color="#c62828" bg="#ffebee">{p}</PillTag>)}</div>
                </div>
              )}

              {current.safetyTests.complianceViolations.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#e65100', fontWeight: 600, marginBottom: '4px' }}>Compliance violations:</div>
                  {current.safetyTests.complianceViolations.map((v, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#555', background: '#fff3e0', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px' }}>
                      <strong>{v.rule}</strong> — {v.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------------------
              Performance panel
          --------------------------------------------------------------------------- */}
          {current.performanceTests && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '20px 24px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <SectionHeader
                icon="⚡"
                title="Performance"
                status={current.performanceTests.tokenCount.recommendation === 'optimal' ? 'pass' : current.performanceTests.tokenCount.recommendation === 'high' ? 'warn' : 'fail'}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Tokens</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>{current.performanceTests.tokenCount.total.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    sys: {current.performanceTests.tokenCount.system} / user: {current.performanceTests.tokenCount.user}
                  </div>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Est. Latency</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>{current.performanceTests.estimatedLatency}ms</div>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Cost / 1K req</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>
                    {current.performanceTests.estimatedCost.currency} {current.performanceTests.estimatedCost.per1000Requests.toFixed(3)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Token usage: </span>
                <PillTag
                  color={current.performanceTests.tokenCount.recommendation === 'optimal' ? '#2e7d32' : current.performanceTests.tokenCount.recommendation === 'high' ? '#e65100' : '#c62828'}
                  bg={current.performanceTests.tokenCount.recommendation === 'optimal' ? '#e8f5e9' : current.performanceTests.tokenCount.recommendation === 'high' ? '#fff3e0' : '#ffebee'}
                >
                  {current.performanceTests.tokenCount.recommendation}
                </PillTag>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------------------
              Improvement suggestions
          --------------------------------------------------------------------------- */}
          {current.improvementSuggestions && current.improvementSuggestions.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '20px 24px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <SectionHeader icon="💡" title="Improvement Suggestions" />
              {current.improvementSuggestions.map((s, idx) => (
                <div key={idx} style={{
                  border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px',
                  marginBottom: '10px', background: s.acceptedByUser ? '#f1f8e9' : '#fafafa'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <PillTag
                        color={s.priority === 'high' ? '#c62828' : s.priority === 'medium' ? '#e65100' : '#2e7d32'}
                        bg={s.priority === 'high' ? '#ffebee' : s.priority === 'medium' ? '#fff3e0' : '#e8f5e9'}
                      >
                        {s.priority} priority
                      </PillTag>
                      <PillTag color="#1976d2" bg="#e3f2fd">{s.category}</PillTag>
                    </div>
                    {s.acceptedByUser ? (
                      <span style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 600 }}>✓ Accepted</span>
                    ) : (
                      <button
                        onClick={() => handleAcceptSuggestion(current._id, idx)}
                        style={{
                          padding: '4px 14px', borderRadius: '6px', border: '1px solid #4caf50',
                          background: 'white', color: '#2e7d32', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Accept
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{s.reason}</div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Current</div>
                      <div style={{ fontSize: '13px', color: '#c62828', background: '#ffebee', padding: '6px 10px', borderRadius: '6px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{s.current}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Suggested</div>
                      <div style={{ fontSize: '13px', color: '#2e7d32', background: '#e8f5e9', padding: '6px 10px', borderRadius: '6px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{s.suggested}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TestResultsViewer;
