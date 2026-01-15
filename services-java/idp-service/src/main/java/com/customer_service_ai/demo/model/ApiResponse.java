package com.customer_service_ai.demo.model;

import java.util.HashMap;
import java.util.Map;

public class ApiResponse {
    private int statusCode;
    private String statusMessage;
    private Map<String, Object> data;

    public ApiResponse(int statusCode, String statusMessage, Map<String, Object> data) {
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.data = data;
    }

    // Success with message string
    public static ApiResponse success(String message) {
        Map<String, Object> data = new HashMap<>();
        data.put("message", message);
        return new ApiResponse(200, "success", data);
    }

    // Success with data object
    public static ApiResponse success(Map<String, Object> data) {
        return new ApiResponse(200, "success", data);
    }

    // Success with custom status code and message
    public static ApiResponse success(int statusCode, String message) {
        Map<String, Object> data = new HashMap<>();
        data.put("message", message);
        return new ApiResponse(statusCode, "success", data);
    }

    // Success with custom status code and data object
    public static ApiResponse success(int statusCode, Map<String, Object> data) {
        return new ApiResponse(statusCode, "success", data);
    }

    // Error with message string
    public static ApiResponse error(String message) {
        Map<String, Object> data = new HashMap<>();
        data.put("message", message);
        return new ApiResponse(500, "error", data);
    }

    // Error with data object
    public static ApiResponse error(Map<String, Object> data) {
        return new ApiResponse(500, "error", data);
    }

    // Error with custom status code and message
    public static ApiResponse error(int statusCode, String message) {
        Map<String, Object> data = new HashMap<>();
        data.put("message", message);
        return new ApiResponse(statusCode, "error", data);
    }

    // Error with custom status code and data object
    public static ApiResponse error(int statusCode, Map<String, Object> data) {
        return new ApiResponse(statusCode, "error", data);
    }

    public int getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public String getStatusMessage() {
        return statusMessage;
    }

    public void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }
}
