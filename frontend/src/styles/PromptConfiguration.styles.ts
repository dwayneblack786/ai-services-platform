import styled from '@emotion/styled';

export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
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

export const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 24px;
`;

export const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid ${(props) => props.active ? '#4f46e5' : 'transparent'};
  color: ${(props) => props.active ? '#4f46e5' : '#6b7280'};
  font-weight: ${(props) => props.active ? 600 : 400};
  cursor: pointer;
  margin-bottom: -2px;
  transition: all 0.2s;

  &:hover {
    color: #4f46e5;
  }
`;

export const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

export const CollapsibleCard = styled(Card)<{ collapsed?: boolean }>`
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.collapsed && `
    padding: 16px 24px;
  `}
`;

export const CollapsibleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
`;

export const CollapsibleIcon = styled.span<{ collapsed?: boolean }>`
  font-size: 20px;
  transition: transform 0.2s;
  color: #6b7280;
  
  ${props => !props.collapsed && `
    transform: rotate(180deg);
  `}
`;

export const CollapsibleContent = styled.div<{ collapsed?: boolean }>`
  margin-top: 20px;
  
  ${props => props.collapsed && `
    display: none;
  `}
`;

export const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

export const SectionDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0 0;
`;

export const FormGroup = styled.div`
  margin-bottom: 20px;
`;

export const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
`;

export const HelpText = styled.p`
  font-size: 13px;
  color: #6b7280;
  margin: 4px 0 0 0;
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

export const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`;

export const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
`;

export const TagRemove = styled.button`
  background: none;
  border: none;
  color: #4338ca;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  
  &:hover {
    color: #3730a3;
  }
`;

export const TagInput = styled(Input)`
  margin-top: 8px;
`;

export const RepeaterItem = styled.div`
  padding: 16px;
  margin-bottom: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  position: relative;
`;

export const RepeaterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

export const RepeaterTitle = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 14px;
`;

export const RemoveButton = styled.button`
  padding: 4px 12px;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  
  &:hover {
    background: #fecaca;
  }
`;

export const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
`;

export const SecondaryButton = styled(Button)`
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;

  &:hover {
    background: #f9fafb;
  }
`;

export const AddButton = styled(SecondaryButton)`
  margin-top: 12px;
`;

export const SwitchContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
`;

export const SwitchInput = styled.input`
  width: 44px;
  height: 24px;
  position: relative;
  appearance: none;
  background: #d1d5db;
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  transition: background 0.2s;
  
  &:checked {
    background: #4f46e5;
  }
  
  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    background: white;
    transition: transform 0.2s;
  }
  
  &:checked::before {
    transform: translateX(20px);
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #e5e7eb;
`;

export const PrimaryButton = styled(Button)`
  background: #4f46e5;
  color: white;

  &:hover {
    background: #4338ca;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
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

export const SuccessMessage = styled.div`
  padding: 12px 16px;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  color: #065f46;
  margin-bottom: 24px;
`;
