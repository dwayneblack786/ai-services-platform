package com.ai.va.service.tts;

/**
 * Represents a TTS voice with metadata
 * 
 * Contains information about voice characteristics including name, language,
 * gender, and style for neural voices.
 */
public class Voice {
    
    private final String name;
    private final String displayName;
    private final String language;
    private final String locale;
    private final Gender gender;
    private final VoiceType type;
    private final String styleList;  // Comma-separated styles (e.g., "cheerful,sad,angry")
    
    public enum Gender {
        MALE,
        FEMALE,
        NEUTRAL,
        UNKNOWN
    }
    
    public enum VoiceType {
        NEURAL,      // High-quality neural voice
        STANDARD,    // Standard voice
        PREMIUM      // Premium/custom voice
    }
    
    private Voice(Builder builder) {
        this.name = builder.name;
        this.displayName = builder.displayName;
        this.language = builder.language;
        this.locale = builder.locale;
        this.gender = builder.gender;
        this.type = builder.type;
        this.styleList = builder.styleList;
    }
    
    public String getName() {
        return name;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public String getLanguage() {
        return language;
    }
    
    public String getLocale() {
        return locale;
    }
    
    public Gender getGender() {
        return gender;
    }
    
    public VoiceType getType() {
        return type;
    }
    
    public String getStyleList() {
        return styleList;
    }
    
    public boolean hasStyles() {
        return styleList != null && !styleList.isEmpty();
    }
    
    public String[] getStyles() {
        if (!hasStyles()) {
            return new String[0];
        }
        return styleList.split(",");
    }
    
    @Override
    public String toString() {
        return String.format("Voice{name='%s', displayName='%s', language='%s', gender=%s, type=%s}",
                name, displayName, language, gender, type);
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String name;
        private String displayName;
        private String language;
        private String locale;
        private Gender gender = Gender.UNKNOWN;
        private VoiceType type = VoiceType.STANDARD;
        private String styleList = "";
        
        public Builder name(String name) {
            this.name = name;
            return this;
        }
        
        public Builder displayName(String displayName) {
            this.displayName = displayName;
            return this;
        }
        
        public Builder language(String language) {
            this.language = language;
            return this;
        }
        
        public Builder locale(String locale) {
            this.locale = locale;
            return this;
        }
        
        public Builder gender(Gender gender) {
            this.gender = gender;
            return this;
        }
        
        public Builder type(VoiceType type) {
            this.type = type;
            return this;
        }
        
        public Builder styleList(String styleList) {
            this.styleList = styleList;
            return this;
        }
        
        public Voice build() {
            if (name == null || name.trim().isEmpty()) {
                throw new IllegalStateException("Voice name is required");
            }
            if (language == null || language.trim().isEmpty()) {
                throw new IllegalStateException("Voice language is required");
            }
            if (displayName == null) {
                displayName = name;
            }
            if (locale == null) {
                locale = language;
            }
            return new Voice(this);
        }
    }
    
    /**
     * Create a quick voice instance for testing
     */
    public static Voice of(String name, String language, Gender gender) {
        return Voice.builder()
                .name(name)
                .displayName(name)
                .language(language)
                .locale(language)
                .gender(gender)
                .type(VoiceType.NEURAL)
                .build();
    }
}
