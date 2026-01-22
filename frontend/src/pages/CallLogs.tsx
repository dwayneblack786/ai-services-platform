import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useNavigate } from 'react-router-dom';
import {
  PageContainer,
  Header,
  Title,
  FilterBar,
  Select,
  Input,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  StatusBadge,
  Button,
  EmptyState,
  LoadingState,
  ErrorMessage,
} from '../styles/CallLogs.styles';

interface CallLogsProps {
  productId?: string;
}

interface CallLog {
  _id: string;
  customerId: string;
  callerNumber: string;
  assistantNumber: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  status: 'in-progress' | 'completed' | 'missed' | 'forwarded' | 'failed';
  channel: string;
  transcript?: Array<{ speaker: string; text: string }>;
}

const CallLogs: React.FC<CallLogsProps> = ({ productId }) => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCallLogs();
  }, []);

  const fetchCallLogs = async () => {
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

      // Backend returns { logs: [...], pagination: {...} }
      const data = response.data;
      setCalls(data.logs || data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load call logs');
      console.error('Error fetching call logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = (calls || []).filter(call => {
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    const matchesSearch = 
      (call.callerNumber || '').includes(searchTerm) ||
      (call.assistantNumber || '').includes(searchTerm) ||
      call._id.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewTranscript = (callId: string) => {
    navigate(`/transcripts?callId=${callId}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState>Loading call logs...</LoadingState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>Call Logs</Title>
        <Button onClick={fetchCallLogs}>Refresh</Button>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <FilterBar>
        <Select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="in-progress">In Progress</option>
          <option value="missed">Missed</option>
          <option value="forwarded">Forwarded</option>
          <option value="failed">Failed</option>
        </Select>

        <Input
          type="text"
          placeholder="Search by phone number or ID..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />
      </FilterBar>

      {filteredCalls.length === 0 ? (
        <EmptyState>
          {calls.length === 0 ? 'No call logs found' : 'No calls match your filters'}
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Date & Time</Th>
              <Th>Caller</Th>
              <Th>Assistant Number</Th>
              <Th>Duration</Th>
              <Th>Status</Th>
              <Th>Channel</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredCalls.map((call) => (
              <Tr key={call._id}>
                <Td>{formatDate(call.startTime)}</Td>
                <Td>{call.callerNumber}</Td>
                <Td>{call.assistantNumber}</Td>
                <Td>{formatDuration(call.durationSeconds)}</Td>
                <Td>
                  <StatusBadge status={call.status}>
                    {call.status.replace('-', ' ')}
                  </StatusBadge>
                </Td>
                <Td>{call.channel || 'voice'}</Td>
                <Td>
                  {call.transcript && call.transcript.length > 0 && (
                    <Button onClick={() => viewTranscript(call._id)}>
                      View Transcript
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </PageContainer>
  );
};

export default CallLogs;
