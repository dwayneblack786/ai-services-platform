package com.ai.va.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Prompt Context
 * Contains tenant-specific context to ground AI responses
 * Supports multi-layered prompt configuration:
 * - Business Identity (Role/Persona)
 * - Static Business Knowledge
 * - Conversation Behavior
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class PromptContext {
    
    // === BUSINESS IDENTITY (Role/Persona Layer) ===
    private String tenantName;
    private String tenantIndustry;
    private String tone;  // professional, friendly, formal, casual
    private String personality;  // helpful, strict, empathetic, concise
    private List<String> allowedActions;  // book_appointment, provide_quote, answer_faq
    private List<String> disallowedActions;  // give_medical_advice, provide_legal_advice
    
    // === STATIC BUSINESS KNOWLEDGE ===
    private String businessContext;  // General business description
    private List<String> servicesOffered;
    private String pricingInfo;
    private List<Object> locations;  // Can be String or Map with structured location data
    private String businessHours;
    private String policies;  // Return, cancellation, privacy policies
    private List<String> faqs;  // Common questions and answers
    private String productCatalog;  // Product/service listings
    
    // === CONVERSATION BEHAVIOR ===
    private Integer maxResponseLength;  // Max characters/words in response
    private String escalationTriggers;  // When to transfer to human
    private Boolean askForNameFirst;  // Require customer name
    private Boolean confirmBeforeActions;  // Confirm before booking/orders
    private String defaultLanguage;  // en, es, fr, etc.
    private Integer conversationMemoryTurns;  // How many turns to remember
    
    // === CUSTOM VARIABLES ===
    private Map<String, String> customVariables;

    public PromptContext() {
    }

    // === GETTERS AND SETTERS ===
    
    // Business Identity
    public String getTenantName() { return tenantName; }
    public void setTenantName(String tenantName) { this.tenantName = tenantName; }
    
    public String getTenantIndustry() { return tenantIndustry; }
    public void setTenantIndustry(String tenantIndustry) { this.tenantIndustry = tenantIndustry; }
    
    public String getTone() { return tone; }
    public void setTone(String tone) { this.tone = tone; }
    
    public String getPersonality() { return personality; }
    public void setPersonality(String personality) { this.personality = personality; }
    
    public List<String> getAllowedActions() { return allowedActions; }
    public void setAllowedActions(List<String> allowedActions) { this.allowedActions = allowedActions; }
    
    public List<String> getDisallowedActions() { return disallowedActions; }
    public void setDisallowedActions(List<String> disallowedActions) { this.disallowedActions = disallowedActions; }
    
    // Business Knowledge
    public String getBusinessContext() { return businessContext; }
    public void setBusinessContext(String businessContext) { this.businessContext = businessContext; }
    
    public List<String> getServicesOffered() { return servicesOffered; }
    public void setServicesOffered(List<String> servicesOffered) { this.servicesOffered = servicesOffered; }
    
    public String getPricingInfo() { return pricingInfo; }
    public void setPricingInfo(String pricingInfo) { this.pricingInfo = pricingInfo; }
    
    public List<Object> getLocations() { return locations; }
    public void setLocations(List<Object> locations) { this.locations = locations; }
    
    public String getBusinessHours() { return businessHours; }
    public void setBusinessHours(String businessHours) { this.businessHours = businessHours; }
    
    public String getPolicies() { return policies; }
    public void setPolicies(String policies) { this.policies = policies; }
    
    public List<String> getFaqs() { return faqs; }
    public void setFaqs(List<String> faqs) { this.faqs = faqs; }
    
    public String getProductCatalog() { return productCatalog; }
    public void setProductCatalog(String productCatalog) { this.productCatalog = productCatalog; }
    
    // Conversation Behavior
    public Integer getMaxResponseLength() { return maxResponseLength; }
    public void setMaxResponseLength(Integer maxResponseLength) { this.maxResponseLength = maxResponseLength; }
    
    public String getEscalationTriggers() { return escalationTriggers; }
    public void setEscalationTriggers(String escalationTriggers) { this.escalationTriggers = escalationTriggers; }
    
    public Boolean getAskForNameFirst() { return askForNameFirst; }
    public void setAskForNameFirst(Boolean askForNameFirst) { this.askForNameFirst = askForNameFirst; }
    
    public Boolean getConfirmBeforeActions() { return confirmBeforeActions; }
    public void setConfirmBeforeActions(Boolean confirmBeforeActions) { this.confirmBeforeActions = confirmBeforeActions; }
    
    public String getDefaultLanguage() { return defaultLanguage; }
    public void setDefaultLanguage(String defaultLanguage) { this.defaultLanguage = defaultLanguage; }
    
    public Integer getConversationMemoryTurns() { return conversationMemoryTurns; }
    public void setConversationMemoryTurns(Integer conversationMemoryTurns) { this.conversationMemoryTurns = conversationMemoryTurns; }
    
    // Custom Variables
    public Map<String, String> getCustomVariables() { return customVariables; }
    public void setCustomVariables(Map<String, String> customVariables) { this.customVariables = customVariables; }

    /**
     * Build the Role/Persona section of the prompt
     */
    public String buildRoleSection() {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a ");
        
        if (personality != null && !personality.trim().isEmpty()) {
            sb.append(personality).append(" ");
        } else {
            sb.append("helpful ");
        }
        
        sb.append("virtual assistant for ");
        
        if (tenantName != null && !tenantName.trim().isEmpty()) {
            sb.append(tenantName);
        } else {
            sb.append("this business");
        }
        
        if (tenantIndustry != null && !tenantIndustry.trim().isEmpty()) {
            sb.append(", a business in the ").append(tenantIndustry).append(" industry");
        }
        
        sb.append(".\n");
        
        if (tone != null && !tone.trim().isEmpty()) {
            sb.append("Your tone should be: ").append(tone).append(".\n");
        } else {
            sb.append("Your tone should be: professional and friendly.\n");
        }
        
        if (allowedActions != null && !allowedActions.isEmpty()) {
            sb.append("\nYou can help with: ").append(String.join(", ", allowedActions)).append(".\n");
        } else {
            sb.append("\nYou can help with: answering questions, providing information, and general assistance.\n");
        }
        
        if (disallowedActions != null && !disallowedActions.isEmpty()) {
            sb.append("You must NOT: ").append(String.join(", ", disallowedActions)).append(".\n");
        }
        
        return sb.toString();
    }

    /**
     * Build the Business Context section of the prompt
     */
    public String buildBusinessContextSection() {
        StringBuilder sb = new StringBuilder();
        
        if (businessContext != null && !businessContext.trim().isEmpty()) {
            sb.append(businessContext).append("\n\n");
        }
        
        if (servicesOffered != null && !servicesOffered.isEmpty()) {
            sb.append("Services offered:\n");
            for (String service : servicesOffered) {
                if (service != null && !service.trim().isEmpty()) {
                    sb.append("- ").append(service).append("\n");
                }
            }
            sb.append("\n");
        }
        
        if (businessHours != null && !businessHours.trim().isEmpty()) {
            sb.append("Business hours: ").append(businessHours).append("\n");
        }
        
        if (locations != null && !locations.isEmpty()) {
            sb.append("\n=== LOCATIONS / FACILITIES ===\n");
            for (Object loc : locations) {
                if (loc == null) continue;
                
                // Handle structured location objects (Maps from MongoDB)
                if (loc instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> locMap = (Map<String, Object>) loc;
                    
                    String name = (String) locMap.get("name");
                    String type = (String) locMap.get("type");
                    String address = (String) locMap.get("address");
                    String phone = (String) locMap.get("phone");
                    String distance = (String) locMap.get("distance");
                    String hours = (String) locMap.get("hours");
                    
                    if (name != null && !name.trim().isEmpty()) {
                        sb.append("\n").append(name);
                        if (type != null && !type.trim().isEmpty()) {
                            sb.append(" (").append(type).append(")");
                        }
                        sb.append(":\n");
                        
                        if (address != null && !address.trim().isEmpty()) {
                            sb.append("  Address: ").append(address).append("\n");
                        }
                        if (phone != null && !phone.trim().isEmpty()) {
                            sb.append("  Phone: ").append(phone).append("\n");
                        }
                        if (hours != null && !hours.trim().isEmpty()) {
                            sb.append("  Hours: ").append(hours).append("\n");
                        }
                        if (distance != null && !distance.trim().isEmpty()) {
                            sb.append("  Distance: ").append(distance).append("\n");
                        }
                        
                        // Include services if available
                        @SuppressWarnings("unchecked")
                        List<String> services = (List<String>) locMap.get("services");
                        if (services != null && !services.isEmpty()) {
                            sb.append("  Services: ").append(String.join(", ", services)).append("\n");
                        }
                    }
                } 
                // Handle simple string locations
                else if (loc instanceof String) {
                    String locStr = (String) loc;
                    if (!locStr.trim().isEmpty()) {
                        sb.append("- ").append(locStr).append("\n");
                    }
                }
            }
            sb.append("\n");
        }
        
        if (pricingInfo != null && !pricingInfo.trim().isEmpty()) {
            sb.append("\nPricing: ").append(pricingInfo).append("\n");
        }
        
        if (policies != null && !policies.trim().isEmpty()) {
            sb.append("\nPolicies: ").append(policies).append("\n");
        }
        
        if (faqs != null && !faqs.isEmpty()) {
            sb.append("\nFrequently Asked Questions:\n");
            for (String faq : faqs) {
                if (faq != null && !faq.trim().isEmpty()) {
                    sb.append("- ").append(faq).append("\n");
                }
            }
        }
        
        // Return default message if no context was added
        if (sb.length() == 0) {
            sb.append("General business information available upon request.\n");
        }
        
        return sb.toString();
    }

    /**
     * Build conversation behavior constraints
     */
    public String buildBehaviorConstraints() {
        StringBuilder sb = new StringBuilder();
        
        if (maxResponseLength != null && maxResponseLength > 0) {
            sb.append("- Keep responses under ").append(maxResponseLength).append(" characters.\n");
        } else {
            sb.append("- Keep responses concise and to the point.\n");
        }
        
        if (Boolean.TRUE.equals(askForNameFirst)) {
            sb.append("- Always ask for the customer's name at the start of the conversation.\n");
        }
        
        if (Boolean.TRUE.equals(confirmBeforeActions)) {
            sb.append("- Always confirm before taking actions like booking or placing orders.\n");
        }
        
        if (escalationTriggers != null && !escalationTriggers.trim().isEmpty()) {
            sb.append("- Escalate to human when: ").append(escalationTriggers).append("\n");
        }
        
        return sb.toString();
    }

    @Override
    public String toString() {
        return "PromptContext{" +
                "tenantName='" + tenantName + '\'' +
                ", tenantIndustry='" + tenantIndustry + '\'' +
                ", tone='" + tone + '\'' +
                ", personality='" + personality + '\'' +
                '}';
    }
}
