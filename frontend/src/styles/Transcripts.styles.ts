import styled from '@emotion/styled';

export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
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

export const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

export const MetaInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

export const MetaItem = styled.div``;

export const MetaLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

export const MetaValue = styled.div`
  font-size: 14px;
  color: #1f2937;
`;

export const TranscriptContainer = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 24px;
  max-height: 600px;
  overflow-y: auto;
`;

export const Message = styled.div<{ speaker: string }>`
  margin-bottom: 16px;
  display: flex;
  justify-content: ${(props: { speaker: string }) => props.speaker === 'caller' ? 'flex-start' : 'flex-end'};
`;

export const MessageBubble = styled.div<{ speaker: string }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${(props: { speaker: string }) => props.speaker === 'caller' ? '#ffffff' : '#4f46e5'};
  color: ${(props: { speaker: string }) => props.speaker === 'caller' ? '#1f2937' : '#ffffff'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

export const Speaker = styled.div<{ speaker: string }>`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
  color: ${(props: { speaker: string }) => props.speaker === 'caller' ? '#6b7280' : '#c7d2fe'};
`;

export const MessageText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
`;

export const Timestamp = styled.div`
  font-size: 10px;
  opacity: 0.6;
  margin-top: 4px;
`;

export const IntentBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: #dbeafe;
  color: #1e40af;
  margin-left: 8px;
`;

export const SlotChip = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  background: #d1fae5;
  color: #065f46;
  margin-right: 4px;
  margin-top: 4px;
`;

export const SlotsContainer = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
`;

export const ActionBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

export const Button = styled.button`
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

export const SecondaryButton = styled(Button)`
  background: white;
  color: #4f46e5;
  border: 1px solid #4f46e5;

  &:hover {
    background: #eef2ff;
  }
`;
