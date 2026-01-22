import styled from '@emotion/styled';

export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

export const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
`;

export const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

export const Select = styled.select`
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

export const Input = styled.input`
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

export const Table = styled.table`
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const Thead = styled.thead`
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

export const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
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

export const Td = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  color: #1f2937;
`;

export const StatusBadge = styled.span<{ status: string }>`
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

export const Button = styled.button`
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

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
`;

export const LoadingState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
`;

export const ErrorMessage = styled.div`
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  margin-bottom: 24px;
`;
