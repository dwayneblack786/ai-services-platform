package com.ai.va.application;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.beans.factory.annotation.Autowired;

@SpringBootApplication
@EnableAsync
@ComponentScan(basePackages = {"com.ai.va"})
public class VaServiceApplication {

	@Autowired
	private Environment environment;

	public static void main(String[] args) {
		SpringApplication.run(VaServiceApplication.class, args);
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady() {
		String port = environment.getProperty("server.port", "8080");
		String contextPath = environment.getProperty("server.servlet.context-path", "");
		String host = environment.getProperty("server.address", "localhost");
		
		String portout = port + String.format("%" + (56 - port.length()) + "s", "");
		String url = host + ":" + port + contextPath + String.format("%" + (38 - host.length() - port.length() - contextPath.length()) + "s", "");
		System.out.print("\n" +
			"╔══════════════════════════════════════════════════════════════╗\n" +
			"║                                                              ║\n" +
			"║         🚀  VA-SERVICE APPLICATION STARTED  🚀              "+ "   ║\n" +
			"║                                                              ║\n" +
			"║  Server URL: http://" + url                                + "  ║\n" +
			"║                                                              ║\n" +
			"║  Health Checks:                                              ║\n" +
			"║    GET  /                - Root endpoint (service info)      ║\n" +
			"║    GET  /health          - Health check                      ║\n" +
			"║    GET  /ready           - Readiness probe                   ║\n" +
			"║    GET  /live            - Liveness probe                    ║\n" +
			"║                                                              ║\n" +
			"║  Voice Endpoints:                                            ║\n" +
			"║    POST /voice/session   - Initialize voice session          ║\n" +
			"║    POST /voice/process   - Process audio chunk               ║\n" +
			"║    POST /voice/end       - End voice session                 ║\n" +
			"║                                                              ║\n" +
			"║  Chat Endpoints:                                             ║\n" +
			"║    POST /chat/session    - Initialize chat session           ║\n" +
			"║    POST /chat/message    - Process chat message              ║\n" +
			"║    GET  /chat/message/stream - Stream chat (SSE)             ║\n" +
			"║    POST /chat/end        - End chat session                  ║\n" +
			"║    GET  /chat/history    - Get session history               ║\n" +
			"║                                                              ║\n" +
			"╚══════════════════════════════════════════════════════════════╝\n");
	}

}
