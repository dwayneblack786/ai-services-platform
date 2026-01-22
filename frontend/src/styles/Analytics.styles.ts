import styled from '@emotion/styled';

export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
`;

export const Header = styled.div`
  margin-bottom: 32px;
`;

export const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

export const Subtitle = styled.p`
  color: #6b7280;
  margin: 0;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

export const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 16px;
`;

export const CardTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin: 0;
`;

export const CardIcon = styled.div`
  font-size: 24px;
`;

export const CardValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
`;

export const CardSubtext = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

export const ChartCard = styled(Card)`
  grid-column: span 2;

  @media (max-width: 968px) {
    grid-column: span 1;
  }
`;

export const ChartTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 24px 0;
`;

export const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 200px;
`;

export const Bar = styled.div<{ height: number; color: string }>`
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

export const BarLabel = styled.div`
  position: absolute;
  bottom: -24px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  width: 100%;
`;

export const BarValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const Thead = styled.thead`
  border-bottom: 1px solid #e5e7eb;
`;

export const Th = styled.th`
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

export const Td = styled.td`
  padding: 12px;
  font-size: 14px;
  color: #1f2937;
`;

export const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
`;

export const ProgressFill = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${(props: { width: number }) => props.width}%;
  background: ${(props: { color: string }) => props.color};
  transition: width 0.3s;
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

export const TimeRangeSelector = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;

export const TimeButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? '#4f46e5' : 'white'};
  color: ${props => props.active ? 'white' : '#6b7280'};
  border: 1px solid ${props => props.active ? '#4f46e5' : '#d1d5db'};
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #4f46e5;
    color: ${props => props.active ? 'white' : '#4f46e5'};
  }
`;
