import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import styled from '@emotion/styled';

interface AnalyticsProps {
  productId?: string;
}

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin: 0;
`;

const CardIcon = styled.div`
  font-size: 24px;
`;

const CardValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
`;

const CardSubtext = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const ChartCard = styled(Card)`
  grid-column: span 2;

  @media (max-width: 968px) {
    grid-column: span 1;
  }
`;

const ChartTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 24px 0;
`;

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 200px;
`;

const Bar = styled.div<{ height: number; color: string }>`
  flex: 1;
  height: ${(props: { height: number }) => props.height}%;
  background: ${(props: { color: string }) => props.color};
  border-radius: 4px 4px 0 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: 8px;
  position: relative;
  transition: all 0.3s;

  &:hover {
    opacity: 0.8;
  }
`;

const BarLabel = styled.div`
  position: absolute;
  bottom: -24px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  width: 100%;
`;

const BarValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  border-bottom: 1px solid #e5e7eb;
`;

const Th = styled.th`
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 12px;
  font-size: 14px;
  color: #1f2937;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
`;

const ProgressFill = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${(props: { width: number }) => props.width}%;
  background: ${(props: { color: string }) => props.color};
  transition: width 0.3s;
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

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #4f46e5;
  }
`;

interface AnalyticsData {
  totalCalls: number;
  totalChats: number;
  avgDuration: number;
  completionRate: number;
  totalCost: number;
  usage: {
    sttSeconds: number;
    ttsCharacters: number;
    llmTokensIn: number;
    llmTokensOut: number;
  };
  channelBreakdown: {
    voice: number;
    chat: number;
  };
  dailyStats: Array<{
    date: string;
    calls: number;
    chats: number;
  }>;
  topIntents: Array<{
    intent: string;
    count: number;
  }>;
}

const Analytics: React.FC<AnalyticsProps> = ({ productId }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await apiClient.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/analytics?range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState>Loading analytics...</LoadingState>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </PageContainer>
    );
  }

  const maxDailyValue = Math.max(
    ...data.dailyStats.map(s => s.calls + s.chats)
  );

  return (
    <PageContainer>
      <Header>
        <Title>Analytics Dashboard</Title>
        <Subtitle>AI Assistant performance metrics and usage statistics</Subtitle>
      </Header>

      <FilterBar>
        <Select value={timeRange} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeRange(e.target.value)}>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </Select>
      </FilterBar>

      <Grid>
        {/* Total Interactions */}
        <Card>
          <CardHeader>
            <CardTitle>Total Interactions</CardTitle>
            <CardIcon>📊</CardIcon>
          </CardHeader>
          <CardValue>{formatNumber(data.totalCalls + data.totalChats)}</CardValue>
          <CardSubtext>
            {formatNumber(data.totalCalls)} calls • {formatNumber(data.totalChats)} chats
          </CardSubtext>
        </Card>

        {/* Average Duration */}
        <Card>
          <CardHeader>
            <CardTitle>Avg Duration</CardTitle>
            <CardIcon>⏱️</CardIcon>
          </CardHeader>
          <CardValue>{Math.round(data.avgDuration / 60)}m</CardValue>
          <CardSubtext>{Math.round(data.avgDuration)} seconds average</CardSubtext>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardIcon>✅</CardIcon>
          </CardHeader>
          <CardValue>{Math.round(data.completionRate)}%</CardValue>
          <CardSubtext>Successfully completed interactions</CardSubtext>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Total Cost</CardTitle>
            <CardIcon>💰</CardIcon>
          </CardHeader>
          <CardValue>{formatCurrency(data.totalCost)}</CardValue>
          <CardSubtext>AI processing costs</CardSubtext>
        </Card>

        {/* Channel Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Channel</CardTitle>
            <CardIcon>📞</CardIcon>
          </CardHeader>
          <CardValue>{formatNumber(data.channelBreakdown.voice)}</CardValue>
          <CardSubtext>
            {data.totalCalls > 0 
              ? Math.round((data.channelBreakdown.voice / (data.totalCalls + data.totalChats)) * 100)
              : 0}% of total
          </CardSubtext>
          <ProgressBar>
            <ProgressFill 
              width={(data.channelBreakdown.voice / (data.totalCalls + data.totalChats)) * 100} 
              color="#4f46e5" 
            />
          </ProgressBar>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat Channel</CardTitle>
            <CardIcon>💬</CardIcon>
          </CardHeader>
          <CardValue>{formatNumber(data.channelBreakdown.chat)}</CardValue>
          <CardSubtext>
            {data.totalChats > 0
              ? Math.round((data.channelBreakdown.chat / (data.totalCalls + data.totalChats)) * 100)
              : 0}% of total
          </CardSubtext>
          <ProgressBar>
            <ProgressFill 
              width={(data.channelBreakdown.chat / (data.totalCalls + data.totalChats)) * 100} 
              color="#10b981" 
            />
          </ProgressBar>
        </Card>

        {/* Daily Activity Chart */}
        <ChartCard>
          <ChartTitle>Daily Activity</ChartTitle>
          <BarChart>
            {data.dailyStats.slice(-7).map((stat, idx) => {
              const total = stat.calls + stat.chats;
              const height = maxDailyValue > 0 ? (total / maxDailyValue) * 100 : 0;
              return (
                <Bar key={idx} height={height} color="#4f46e5">
                  <BarValue>{total}</BarValue>
                  <BarLabel>
                    {new Date(stat.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </BarLabel>
                </Bar>
              );
            })}
          </BarChart>
        </ChartCard>

        {/* Usage Metrics */}
        <Card>
          <CardTitle>AI Usage Metrics</CardTitle>
          <Table style={{ marginTop: '16px' }}>
            <Tbody>
              <Tr>
                <Td>STT Processing</Td>
                <Td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatNumber(Math.round(data.usage.sttSeconds))}s
                </Td>
              </Tr>
              <Tr>
                <Td>TTS Characters</Td>
                <Td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatNumber(data.usage.ttsCharacters)}
                </Td>
              </Tr>
              <Tr>
                <Td>LLM Tokens (In)</Td>
                <Td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatNumber(data.usage.llmTokensIn)}
                </Td>
              </Tr>
              <Tr>
                <Td>LLM Tokens (Out)</Td>
                <Td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatNumber(data.usage.llmTokensOut)}
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Card>

        {/* Top Intents */}
        <Card>
          <CardTitle>Top Intents</CardTitle>
          <Table style={{ marginTop: '16px' }}>
            <Thead>
              <Tr>
                <Th>Intent</Th>
                <Th style={{ textAlign: 'right' }}>Count</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.topIntents.slice(0, 5).map((item, idx) => (
                <Tr key={idx}>
                  <Td style={{ textTransform: 'capitalize' }}>
                    {item.intent.replace('_', ' ')}
                  </Td>
                  <Td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatNumber(item.count)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </Grid>
    </PageContainer>
  );
};

export default Analytics;
