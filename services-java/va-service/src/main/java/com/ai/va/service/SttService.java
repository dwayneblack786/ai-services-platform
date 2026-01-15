package com.ai.va.service;

import com.ai.va.client.SttClient;
import com.ai.va.config.SttConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Speech-to-Text Service
 * Integrates with external STT provider (e.g., Google Cloud Speech, AWS Transcribe)
 */
@Service
public class SttService {

    @Autowired
    private SttClient sttClient;

    @Autowired
    private SttConfig sttConfig;

    /**
     * Transcribe audio chunk to text
     * 
     * @param audioChunk Base64 encoded audio data
     * @return Transcribed text
     */
    public String transcribe(String audioChunk) {
        // TODO: Implement actual STT integration
        // For now, return placeholder
        
        try {
            return sttClient.transcribe(audioChunk, sttConfig.getLanguage());
        } catch (Exception e) {
            throw new RuntimeException("STT transcription failed", e);
        }
    }

    /**
     * Get supported languages
     */
    public String[] getSupportedLanguages() {
        return new String[]{"en-US", "es-ES", "fr-FR", "de-DE"};
    }
}
