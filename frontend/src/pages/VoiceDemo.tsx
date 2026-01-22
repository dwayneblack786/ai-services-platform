import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AssistantChat from '../components/AssistantChat';
import {
  PageContainer,
  ContentWrapper,
  Header,
  Title,
  Subtitle,
  FeatureGrid,
  FeatureCard,
  FeatureIcon,
  FeatureTitle,
  FeatureDescription,
  ChatSection,
  SectionTitle,
  InfoSection,
  InfoTitle,
  InfoList,
  InfoItem,
  InfoIcon,
  InfoText,
  InfoLabel,
  InfoValue,
  BackButton,
} from '../styles/VoiceDemo.styles';

const VoiceDemo: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');

  const handleBack = () => {
    if (productId) {
      // Navigate to assistant-channels tab if we have a productId
      navigate(`/products/${productId}/configure/assistant-channels`);
    } else {
      // Fallback to browser back
      navigate(-1);
    }
  };
  return (
    <PageContainer>
      <BackButton 
        onClick={handleBack}
        title={productId ? "Return to Assistant Channels configuration" : "Go back to previous page"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Configuration
      </BackButton>
      
      <ContentWrapper>
        <Header>
          <Title>🎙️ Voice Streaming Demo</Title>
          <Subtitle>
            Experience AI-powered voice conversations with real-time speech-to-text and text-to-speech
          </Subtitle>
        </Header>

        <FeatureGrid>
          <FeatureCard>
            <FeatureIcon>🎤</FeatureIcon>
            <FeatureTitle>Real-time Speech Recognition</FeatureTitle>
            <FeatureDescription>
              Speak naturally and watch your words appear instantly with OpenAI Whisper or Azure Speech STT
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🔊</FeatureIcon>
            <FeatureTitle>Natural Voice Responses</FeatureTitle>
            <FeatureDescription>
              Hear lifelike AI responses with Azure Neural TTS voices in multiple languages
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>📊</FeatureIcon>
            <FeatureTitle>Audio Visualization</FeatureTitle>
            <FeatureDescription>
              See real-time audio waveforms during recording and playback for visual feedback
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>⚡</FeatureIcon>
            <FeatureTitle>Low Latency Streaming</FeatureTitle>
            <FeatureDescription>
              WebSocket-powered real-time audio streaming for instant responses and feedback
            </FeatureDescription>
          </FeatureCard>
        </FeatureGrid>

        <ChatSection>
          <SectionTitle>Try It Now</SectionTitle>
          <AssistantChat useWebSocket={true} />
        </ChatSection>

        <InfoSection>
          <InfoTitle>How It Works</InfoTitle>
          <InfoList>
            <InfoItem>
              <InfoIcon>1️⃣</InfoIcon>
              <InfoText>
                <InfoLabel>Click the Microphone Button</InfoLabel>
                <InfoValue>
                  Grant microphone permission when prompted. The browser will ask for access only once.
                </InfoValue>
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoIcon>2️⃣</InfoIcon>
              <InfoText>
                <InfoLabel>Start Speaking</InfoLabel>
                <InfoValue>
                  Speak clearly into your microphone. You'll see real-time audio visualization and interim transcription results.
                </InfoValue>
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoIcon>3️⃣</InfoIcon>
              <InfoText>
                <InfoLabel>Watch the Transcription</InfoLabel>
                <InfoValue>
                  Your speech is converted to text using OpenAI Whisper (local dev) or Azure Speech (production). 
                  Interim results appear in real-time, final text appears in the input field.
                </InfoValue>
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoIcon>4️⃣</InfoIcon>
              <InfoText>
                <InfoLabel>Get Voice Responses</InfoLabel>
                <InfoValue>
                  The AI processes your message and responds with both text and voice. 
                  You'll see the "Speaking" indicator and hear the response through your speakers.
                </InfoValue>
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoIcon>5️⃣</InfoIcon>
              <InfoText>
                <InfoLabel>Control Playback</InfoLabel>
                <InfoValue>
                  Use the Stop button to interrupt TTS playback at any time. 
                  All conversations are saved in your session for reference.
                </InfoValue>
              </InfoText>
            </InfoItem>
          </InfoList>

          <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
            <InfoTitle style={{ fontSize: '20px', marginBottom: '16px' }}>Technical Features</InfoTitle>
            <InfoList>
              <InfoItem style={{ borderBottom: 'none', padding: '8px 0' }}>
                <InfoIcon>🔧</InfoIcon>
                <InfoText>
                  <InfoLabel>Dual STT Providers</InfoLabel>
                  <InfoValue>
                    Whisper (local, free) for development • Azure Speech (cloud, paid) for production
                  </InfoValue>
                </InfoText>
              </InfoItem>
              <InfoItem style={{ borderBottom: 'none', padding: '8px 0' }}>
                <InfoIcon>🎵</InfoIcon>
                <InfoText>
                  <InfoLabel>Audio Formats</InfoLabel>
                  <InfoValue>
                    WebM/Opus streaming • MP3/WAV/OGG for TTS • 16kHz sample rate with noise suppression
                  </InfoValue>
                </InfoText>
              </InfoItem>
              <InfoItem style={{ borderBottom: 'none', padding: '8px 0' }}>
                <InfoIcon>🌐</InfoIcon>
                <InfoText>
                  <InfoLabel>Real-time Communication</InfoLabel>
                  <InfoValue>
                    WebSocket (Socket.IO) for instant audio streaming • REST API fallback for reliability
                  </InfoValue>
                </InfoText>
              </InfoItem>
              <InfoItem style={{ borderBottom: 'none', padding: '8px 0' }}>
                <InfoIcon>💾</InfoIcon>
                <InfoText>
                  <InfoLabel>Persistent Storage</InfoLabel>
                  <InfoValue>
                    MongoDB transcript storage • Session-based conversation history • Voice metadata tracking
                  </InfoValue>
                </InfoText>
              </InfoItem>
              <InfoItem style={{ borderBottom: 'none', padding: '8px 0' }}>
                <InfoIcon>🔒</InfoIcon>
                <InfoText>
                  <InfoLabel>Privacy & Security</InfoLabel>
                  <InfoValue>
                    Secure WebSocket connections • Audio processed in real-time (not stored on disk) • GDPR compliant
                  </InfoValue>
                </InfoText>
              </InfoItem>
            </InfoList>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px', border: '1px solid #93c5fd' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#1e40af' }}>
              <span style={{ fontSize: '24px' }}>💡</span>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>Tips for Best Experience</div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
                  <li>Use a quiet environment for better speech recognition accuracy</li>
                  <li>Speak clearly and at a normal pace - not too fast or too slow</li>
                  <li>Keep your microphone 6-12 inches from your mouth</li>
                  <li>Watch for the visual feedback to confirm audio is being captured</li>
                  <li>If the microphone button is red, you're currently recording</li>
                  <li>Check browser console (F12) for detailed debugging information</li>
                </ul>
              </div>
            </div>
          </div>
        </InfoSection>

        <div style={{ marginTop: '32px', textAlign: 'center', color: 'white', opacity: 0.9 }}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            Powered by OpenAI Whisper • Azure Cognitive Services • WebSocket • gRPC
          </p>
          <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.7 }}>
            Built with React • TypeScript • Node.js • Java Spring Boot
          </p>
        </div>
      </ContentWrapper>
    </PageContainer>
  );
};

export default VoiceDemo;
