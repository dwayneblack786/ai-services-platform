package com.ai.va.agent.tools;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.mongodb.client.MongoDatabase;

import java.util.function.Function;

/**
 * Tool Configuration for AI Agent
 * 
 * Each @Bean annotated function becomes a tool the agent can use.
 * The agent decides which tool to call based on the user's request.
 * 
 * Note: Tool integration with LLM requires manual prompt engineering
 * until Spring AI integration is completed.
 */
@Configuration
public class ToolsConfiguration {
    
    @Autowired
    private MongoDatabase database;
    
    /**
     * Tool: Lookup customer orders
     * Description: Look up customer orders by customer ID or order ID. Returns order details including status, items, and total.
     */
    @Bean
    public Function<OrderLookupRequest, OrderLookupResponse> lookupOrder() {
        return (request) -> {
            try {
                // Query MongoDB for orders
                var collection = database.getCollection("orders");
                var query = request.orderId() != null 
                    ? new org.bson.Document("_id", new org.bson.types.ObjectId(request.orderId()))
                    : new org.bson.Document("customerId", request.customerId());
                
                var order = collection.find(query).first();
                
                if (order == null) {
                    return new OrderLookupResponse("not_found", "No order found", null);
                }
                
                return new OrderLookupResponse(
                    "success",
                    "Order found",
                    order.toJson()
                );
            } catch (Exception e) {
                return new OrderLookupResponse("error", e.getMessage(), null);
            }
        };
    }
    
    /**
     * Tool: Get customer information
     * Description: Get customer profile information including name, email, phone, and account status.
     */
    @Bean
    public Function<CustomerInfoRequest, CustomerInfoResponse> getCustomerInfo() {
        return (request) -> {
            try {
                var collection = database.getCollection("customers");
                var customer = collection.find(
                    new org.bson.Document("_id", new org.bson.types.ObjectId(request.customerId()))
                ).first();
                
                if (customer == null) {
                    return new CustomerInfoResponse("not_found", "Customer not found", null);
                }
                
                return new CustomerInfoResponse(
                    "success",
                    "Customer found",
                    customer.toJson()
                );
            } catch (Exception e) {
                return new CustomerInfoResponse("error", e.getMessage(), null);
            }
        };
    }
    
    /**
     * Tool: Schedule appointment
     * Description: Schedule an appointment for a customer. Requires customer ID, preferred date, and time.
     */
    @Bean
    public Function<AppointmentRequest, AppointmentResponse> scheduleAppointment() {
        return (request) -> {
            try {
                var collection = database.getCollection("appointments");
                var appointment = new org.bson.Document()
                    .append("customerId", request.customerId())
                    .append("date", request.date())
                    .append("time", request.time())
                    .append("status", "scheduled")
                    .append("createdAt", new java.util.Date());
                
                collection.insertOne(appointment);
                
                return new AppointmentResponse(
                    "success",
                    "Appointment scheduled successfully",
                    appointment.getObjectId("_id").toString()
                );
            } catch (Exception e) {
                return new AppointmentResponse("error", e.getMessage(), null);
            }
        };
    }
    
    /**
     * Tool: Search knowledge base
     * Description: Search the knowledge base for information about products, services, policies, or FAQs.
     */
    @Bean
    public Function<KnowledgeSearchRequest, KnowledgeSearchResponse> searchKnowledge() {
        return (request) -> {
            try {
                var collection = database.getCollection("knowledge_base");
                var query = new org.bson.Document("$text", 
                    new org.bson.Document("$search", request.query())
                );
                
                var results = new java.util.ArrayList<String>();
                collection.find(query).limit(5).forEach(doc -> {
                    results.add(doc.toJson());
                });
                
                return new KnowledgeSearchResponse(
                    "success",
                    results.size() + " results found",
                    results
                );
            } catch (Exception e) {
                return new KnowledgeSearchResponse("error", e.getMessage(), java.util.List.of());
            }
        };
    }
}

// Request/Response Records for Tools
record OrderLookupRequest(String orderId, String customerId) {}
record OrderLookupResponse(String status, String message, String orderData) {}

record CustomerInfoRequest(String customerId) {}
record CustomerInfoResponse(String status, String message, String customerData) {}

record AppointmentRequest(String customerId, String date, String time) {}
record AppointmentResponse(String status, String message, String appointmentId) {}

record KnowledgeSearchRequest(String query) {}
record KnowledgeSearchResponse(String status, String message, java.util.List<String> results) {}
