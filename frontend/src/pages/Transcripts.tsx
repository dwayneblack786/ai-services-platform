import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useSearchParams } from 'react-router-dom';
import {
  PageContainer,
  Header,
  Title,
  Subtitle,
  Card,
  MetaInfo,
  MetaItem,
  MetaLabel,
  MetaValue,
  TranscriptContainer,
  Message,
  MessageBubble,
  Speaker,
  MessageText,
  Timestamp,
  IntentBadge,
  SlotChip,
  SlotsContainer,
  LoadingState,
  ErrorMessage,
  EmptyState,
  ActionBar,
  Button,
  SecondaryButton,
} from '../styles/Transcripts.styles';

interface TranscriptsProps {
  productId?: string;
}

interface Turn {
  speaker: 'caller' | 'assistant';
  text: string;
  timestamp?: number;
}

interface TranscriptData {
  _id: string;
  sessionId?: string;
  customerId: string;
  callerNumber?: string;
  assistantNumber?: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  status: string;
  channel: string;
  transcript: Turn[];
  currentIntent?: string;
  extractedSlots?: Record<string, any>;
}

const Transcripts: React.FC<TranscriptsProps> = ({ productId }) => {
  const [searchParams] = useSearchParams();
  const callId = searchParams.get('callId');
  const sessionId = searchParams.get('sessionId');
  
  const [data, setData] = useState<TranscriptData | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    if (callId || sessionId) {
      setViewMode('detail');
      fetchTranscript();
    } else {
      setViewMode('list');
      fetchTranscriptList();
    }
  }, [callId, sessionId]);

  const fetchTranscriptList = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await apiClient.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/call-logs`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = response.data;
      setList(data.logs || data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transcripts');
      console.error('Error fetching transcripts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const endpoint = callId 
        ? `/api/call-logs/${callId}`
        : `/api/chat/history/${sessionId}`;

      const response = await apiClient.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transcript');
      console.error('Error fetching transcript:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!data) return;

    const text = data.transcript
      .map(turn => `${turn.speaker.toUpperCase()}: ${turn.text}`)
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${data._id || data.sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState>Loading transcript...</LoadingState>
      </PageContainer>
    );
  }

  if (viewMode === 'list') {
    return (
      <PageContainer>
        <Header>
          <Title>Transcripts</Title>
          <Subtitle>View conversation transcripts for all calls and chat sessions</Subtitle>
        </Header>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {list.length === 0 ? (
          <EmptyState>No transcripts found. Start a conversation to see transcripts here.</EmptyState>
        ) : (
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Date
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Channel
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Duration
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Messages
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                      {formatDate(item.startTime)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: item.channel === 'voice' ? '#dbeafe' : '#d1fae5',
                        color: item.channel === 'voice' ? '#1e40af' : '#065f46'
                      }}>
                        {item.channel === 'voice' ? '📞 Voice' : '💬 Chat'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {formatDuration(item.durationSeconds)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {item.messageCount || 0} messages
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        background: item.status === 'completed' ? '#d1fae5' : '#fee2e2',
                        color: item.status === 'completed' ? '#065f46' : '#991b1b'
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Button onClick={() => window.location.href = `/products/${productId}/configure/transcripts?${item.channel === 'voice' ? 'callId' : 'sessionId'}=${item.sessionId || item._id}`}>
                        View Transcript
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {!data && <EmptyState>No transcript found</EmptyState>}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>Conversation Transcript</Title>
        <Subtitle>
          {data.channel === 'voice' ? 'Voice Call' : 'Chat Session'} • {formatDate(data.startTime)}
        </Subtitle>
      </Header>

      <ActionBar>
        <Button onClick={downloadTranscript}>Download Transcript</Button>
        <SecondaryButton onClick={fetchTranscript}>Refresh</SecondaryButton>
      </ActionBar>

      <Card>
        <MetaInfo>
          {data.callerNumber && (
            <MetaItem>
              <MetaLabel>Caller Number</MetaLabel>
              <MetaValue>{data.callerNumber}</MetaValue>
            </MetaItem>
          )}
          {data.assistantNumber && (
            <MetaItem>
              <MetaLabel>Assistant Number</MetaLabel>
              <MetaValue>{data.assistantNumber}</MetaValue>
            </MetaItem>
          )}
          {data.sessionId && (
            <MetaItem>
              <MetaLabel>Session ID</MetaLabel>
              <MetaValue>{data.sessionId}</MetaValue>
            </MetaItem>
          )}
          <MetaItem>
            <MetaLabel>Duration</MetaLabel>
            <MetaValue>{formatDuration(data.durationSeconds)}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>Status</MetaLabel>
            <MetaValue style={{ textTransform: 'capitalize' }}>
              {data.status.replace('-', ' ')}
            </MetaValue>
          </MetaItem>
          {data.currentIntent && (
            <MetaItem>
              <MetaLabel>Detected Intent</MetaLabel>
              <MetaValue>
                <IntentBadge>{data.currentIntent}</IntentBadge>
              </MetaValue>
            </MetaItem>
          )}
        </MetaInfo>

        {data.extractedSlots && Object.keys(data.extractedSlots).length > 0 && (
          <div>
            <MetaLabel>Extracted Information</MetaLabel>
            <SlotsContainer>
              {Object.entries(data.extractedSlots).map(([key, value]) => (
                <SlotChip key={key}>
                  {key}: {String(value)}
                </SlotChip>
              ))}
            </SlotsContainer>
          </div>
        )}
      </Card>

      <TranscriptContainer>
        {data.transcript.length === 0 ? (
          <EmptyState>No messages in this conversation</EmptyState>
        ) : (
          data.transcript.map((turn, idx) => (
            <Message key={idx} speaker={turn.speaker}>
              <MessageBubble speaker={turn.speaker}>
                <Speaker speaker={turn.speaker}>
                  {turn.speaker === 'caller' ? 'Customer' : 'Assistant'}
                </Speaker>
                <MessageText>{turn.text}</MessageText>
                {turn.timestamp && (
                  <Timestamp>
                    {new Date(turn.timestamp).toLocaleTimeString()}
                  </Timestamp>
                )}
              </MessageBubble>
            </Message>
          ))
        )}
      </TranscriptContainer>
    </PageContainer>
  );
};

export default Transcripts;
