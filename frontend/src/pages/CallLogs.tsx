import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

interface CallLogsProps {
  productId?: string;
}

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
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

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #4f46e5;
  }
`;

const Table = styled.table`
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Thead = styled.thead`
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  color: #1f2937;
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => {
    switch (props.status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#f59e0b';
      case 'missed': return '#ef4444';
      case 'forwarded': return '#3b82f6';
      default: return '#6b7280';
    }
  }};
  background: ${(props: { status: string }) => {
    switch (props.status) {
      case 'completed': return '#d1fae5';
      case 'in-progress': return '#fef3c7';
      case 'missed': return '#fee2e2';
      case 'forwarded': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
`;

const Button = styled.button`
  padding: 6px 12px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #4338ca;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
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

      setCalls(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load call logs');
      console.error('Error fetching call logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = calls.filter(call => {
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    const matchesSearch = 
      call.callerNumber.includes(searchTerm) ||
      call.assistantNumber.includes(searchTerm) ||
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
