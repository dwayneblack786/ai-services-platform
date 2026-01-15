package com.ai.va.service;

import com.ai.va.client.TtsClient;
import com.ai.va.config.TtsConfig;
import com.ai.va.model.VoiceSettings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Text-to-Speech Service
 * Integrates with external TTS provider (e.g., Google Cloud TTS, AWS Polly, ElevenLabs)
 */
@Service
public class TtsService {

    @Autowired
    private TtsClient ttsClient;

    @Autowired
    private TtsConfig ttsConfig;

    /**
     * Synthesize text to audio with custom voice settings
     * 
     * @param text Text to synthesize
     * @param voiceSettings Voice configuration
     * @return Base64 encoded audio data
     */
    public String synthesize(String text, VoiceSettings voiceSettings) {
        try {
            String voiceId = voiceSettings != null ? voiceSettings.getVoiceId() : ttsConfig.getVoiceId();
            String language = voiceSettings != null ? voiceSettings.getLanguage() : ttsConfig.getLanguage();
            double speechRate = voiceSettings != null ? voiceSettings.getSpeechRate() : ttsConfig.getSpeechRate();

            return ttsClient.synthesize(text, voiceId, language, speechRate);
        } catch (Exception e) {
            throw new RuntimeException("TTS synthesis failed", e);
        }
    }

    /**
     * Synthesize text to audio (legacy method)
     * 
     * @param text Text to synthesize
     * @return Base64 encoded audio data
     */
    public String synthesize(String text) {
        // TODO: Implement actual TTS integration
        
        try {
            return ttsClient.synthesize(
                text,
                ttsConfig.getVoiceId(),
                ttsConfig.getLanguage(),
                ttsConfig.getSpeechRate()
            );
        } catch (Exception e) {
            throw new RuntimeException("TTS synthesis failed", e);
        }
    }

    /**
     * Get available voices for a language
     */
    public String[] getAvailableVoices(String language) {
        // Placeholder - implement based on TTS provider
        return new String[]{"en-US-Neural2-A", "en-US-Neural2-C", "en-US-Neural2-D"};
    }
}
