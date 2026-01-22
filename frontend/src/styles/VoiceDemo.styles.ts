import styled from '@emotion/styled';

export const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
`;

export const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

export const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 40px;
`;

export const Title = styled.h1`
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const Subtitle = styled.p`
  font-size: 20px;
  opacity: 0.9;
  margin: 0 0 32px 0;
`;

export const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
`;

export const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }
`;

export const FeatureIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

export const FeatureTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

export const FeatureDescription = styled.p`
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
`;

export const ChatSection = styled.div`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
`;

export const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 24px 0;
  text-align: center;
`;

export const InfoSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

export const InfoTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px 0;
`;

export const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const InfoItem = styled.li`
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  &:last-child {
    border-bottom: none;
  }
`;

export const InfoIcon = styled.span`
  font-size: 20px;
  min-width: 20px;
`;

export const InfoText = styled.div`
  flex: 1;
`;

export const InfoLabel = styled.div`
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

export const InfoValue = styled.div`
  font-size: 14px;
  color: #666;
  line-height: 1.6;
`;

export const BackButton = styled.button`
  position: fixed;
  top: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  color: #4f46e5;
  border: 2px solid rgba(79, 70, 229, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: 1000;

  &:hover {
    background: white;
    border-color: #4f46e5;
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.2);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;
