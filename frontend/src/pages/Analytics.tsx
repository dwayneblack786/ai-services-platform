import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import {
  PageContainer,
  Header,
  Title,
  Subtitle,
  Grid,
  Card,
  CardHeader,
  CardTitle,
  CardIcon,
  CardValue,
  CardSubtext,
  ChartCard,
  ChartTitle,
  BarChart,
  Bar,
  BarLabel,
  BarValue,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  ProgressBar,
  ProgressFill,
  LoadingState,
  ErrorMessage,
  TimeRangeSelector,
  TimeButton,
} from '../styles/Analytics.styles';

interface AnalyticsProps {
  productId?: string;
}

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

      <TimeRangeSelector>
        <TimeButton active={timeRange === '24h'} onClick={() => setTimeRange('24h')}>
          Last 24 Hours
        </TimeButton>
        <TimeButton active={timeRange === '7d'} onClick={() => setTimeRange('7d')}>
          Last 7 Days
        </TimeButton>
        <TimeButton active={timeRange === '30d'} onClick={() => setTimeRange('30d')}>
          Last 30 Days
        </TimeButton>
        <TimeButton active={timeRange === '90d'} onClick={() => setTimeRange('90d')}>
          Last 90 Days
        </TimeButton>
      </TimeRangeSelector>

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
