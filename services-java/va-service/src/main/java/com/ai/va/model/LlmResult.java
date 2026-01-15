package com.ai.va.model;

/**
 * LLM Result Model
 * Contains the response from the language model plus metadata
 */
public class LlmResult {
    
    private String text;
    private int tokensIn;
    private int tokensOut;
    private String model;
    private double latencyMs;

    public LlmResult() {
    }

    public LlmResult(String text, int tokensIn, int tokensOut) {
        this.text = text;
        this.tokensIn = tokensIn;
        this.tokensOut = tokensOut;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public int getTokensIn() {
        return tokensIn;
    }

    public void setTokensIn(int tokensIn) {
        this.tokensIn = tokensIn;
    }

    public int getTokensOut() {
        return tokensOut;
    }

    public void setTokensOut(int tokensOut) {
        this.tokensOut = tokensOut;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public double getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(double latencyMs) {
        this.latencyMs = latencyMs;
    }

    @Override
    public String toString() {
        return "LlmResult{" +
                "text='" + text + '\'' +
                ", tokensIn=" + tokensIn +
                ", tokensOut=" + tokensOut +
                ", model='" + model + '\'' +
                ", latencyMs=" + latencyMs +
                '}';
    }
}
