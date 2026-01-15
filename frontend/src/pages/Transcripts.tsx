import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import styled from '@emotion/styled';
import { useSearchParams } from 'react-router-dom';

interface TranscriptsProps {
  productId?: string;
}

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
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

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const MetaInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetaItem = styled.div``;

const MetaLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const MetaValue = styled.div`
  font-size: 14px;
  color: #1f2937;
`;

const TranscriptContainer = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 24px;
  max-height: 600px;
  overflow-y: auto;
`;

const Message = styled.div<{ speaker: string }>`
  margin-bottom: 16px;
  display: flex;
  justify-content: ${(props: { speaker: string }) => props.speaker === 'caller' ? 'flex-start' : 'flex-end'};
`;

const MessageBubble = styled.div<{ speaker: string }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${(props: { speaker: string }) => props.speaker === 'caller' ? '#ffffff' : '#4f46e5'};
  color: ${(props: { speaker: string }) => props.speaker === 'caller' ? '#1f2937' : '#ffffff'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const Speaker = styled.div<{ speaker: string }>`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
  color: ${(props: { speaker: string }) => props.speaker === 'caller' ? '#6b7280' : '#c7d2fe'};
`;

const MessageText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const Timestamp = styled.div`
  font-size: 10px;
  opacity: 0.6;
  margin-top: 4px;
`;

const IntentBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: #dbeafe;
  color: #1e40af;
  margin-left: 8px;
`;

const SlotChip = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  background: #d1fae5;
  color: #065f46;
  margin-right: 4px;
  margin-top: 4px;
`;

const SlotsContainer = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #4338ca;
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #4f46e5;
  border: 1px solid #4f46e5;

  &:hover {
    background: #eef2ff;
  }
`;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (callId || sessionId) {
      fetchTranscript();
    }
  }, [callId, sessionId]);

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
