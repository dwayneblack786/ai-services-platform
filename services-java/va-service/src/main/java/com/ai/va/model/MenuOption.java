package com.ai.va.model;

/**
 * Menu Option for Session Prompts
 * Represents a selectable prompt option in the chat/voice menu
 */
public class MenuOption {
    private String id;        // MongoDB ObjectId as string (promptId)
    private String text;      // Display text (prompt name)
    private String value;     // Value to send (same as text)
    private String icon;      // Emoji icon for UI
    private String dtmfKey;   // DTMF key for voice: "1", "2", "3", etc.

    public MenuOption() {
    }

    public MenuOption(String id, String text, String value, String icon, String dtmfKey) {
        this.id = id;
        this.text = text;
        this.value = value;
        this.icon = icon;
        this.dtmfKey = dtmfKey;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getDtmfKey() {
        return dtmfKey;
    }

    public void setDtmfKey(String dtmfKey) {
        this.dtmfKey = dtmfKey;
    }

    @Override
    public String toString() {
        return "MenuOption{" +
                "id='" + id + '\'' +
                ", text='" + text + '\'' +
                ", icon='" + icon + '\'' +
                ", dtmfKey='" + dtmfKey + '\'' +
                '}';
    }
}
