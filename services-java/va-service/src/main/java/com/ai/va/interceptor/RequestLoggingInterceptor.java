package com.ai.va.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import java.util.Enumeration;

/**
 * Request Logging Interceptor
 * Logs all incoming HTTP requests with detailed information when debug mode is enabled
 */
@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingInterceptor.class);

    @Value("${app.debug:false}")
    private boolean debugEnabled;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (debugEnabled) {
            long startTime = System.currentTimeMillis();
            request.setAttribute("startTime", startTime);

            logger.info("=== Incoming Request ===");
            logger.info("Method: {}", request.getMethod());
            logger.info("URI: {}", request.getRequestURI());
            logger.info("Query String: {}", request.getQueryString());
            logger.info("Remote Address: {}", request.getRemoteAddr());
            
            // Log headers
            Enumeration<String> headerNames = request.getHeaderNames();
            if (headerNames != null) {
                logger.info("Headers:");
                while (headerNames.hasMoreElements()) {
                    String headerName = headerNames.nextElement();
                    String headerValue = request.getHeader(headerName);
                    logger.info("  {}: {}", headerName, headerValue);
                }
            }
            
            // Log parameters
            if (request.getParameterMap() != null && !request.getParameterMap().isEmpty()) {
                logger.info("Parameters:");
                request.getParameterMap().forEach((key, value) -> 
                    logger.info("  {}: {}", key, String.join(", ", value))
                );
            }
        }
        
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
        if (debugEnabled) {
            long startTime = (Long) request.getAttribute("startTime");
            long endTime = System.currentTimeMillis();
            long executionTime = endTime - startTime;

            logger.info("=== Response ===");
            logger.info("Status Code: {}", response.getStatus());
            logger.info("Execution Time: {} ms", executionTime);
            logger.info("===================");
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        if (debugEnabled && ex != null) {
            logger.error("Request completed with exception: ", ex);
        }
    }
}
