package com.ai.va.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Generic API Client Service
 * Provides methods to call external OpenAPI/REST endpoints
 * Endpoint URLs and authentication can be configured per environment
 */
@Service
public class ApiClientService {

	@Autowired
	@Qualifier("apiRestTemplate")
	private RestTemplate restTemplate;


	/**
	 * Helper method to create HTTP headers from a map
	 *
	 * @param headers Map of header key-value pairs
	 * @return HttpHeaders object
	 */
	private HttpHeaders createHeaders(Map<String, String> headers) {
		HttpHeaders httpHeaders = new HttpHeaders();

		if (headers != null) {
			headers.forEach(httpHeaders::set);
		}

		// Set default Content-Type if not provided
		if (httpHeaders.getContentType() == null) {
			httpHeaders.set(HttpHeaders.CONTENT_TYPE, "application/json");
		}

		return httpHeaders;
	}

	/**
	 * Make a DELETE request to an external API
	 *
	 * @param url The full endpoint URL
	 * @param headers Optional headers (e.g., Authorization, Content-Type)
	 * @param responseType The expected response class type
	 * @return The response object
	 */
	public <T> T delete(String url, Map<String, String> headers, Class<T> responseType) {
		try {
			HttpHeaders httpHeaders = createHeaders(headers);
			HttpEntity<Void> entity = new HttpEntity<>(httpHeaders);

			ResponseEntity<T> response = restTemplate.exchange(
					url,
					HttpMethod.DELETE,
					entity,
					responseType
					);

			return response.getBody();
		} catch (Exception e) {
			throw new RuntimeException("Failed to execute DELETE request to: " + url, e);
		}
	}

	/**
	 * Make a GET request to an external API
	 *
	 * @param url The full endpoint URL
	 * @param headers Optional headers (e.g., Authorization, Content-Type)
	 * @param responseType The expected response class type
	 * @return The response object
	 */
	public <T> T get(String url, Map<String, String> headers, Class<T> responseType) {
		try {
			HttpHeaders httpHeaders = createHeaders(headers);
			HttpEntity<Void> entity = new HttpEntity<>(httpHeaders);

			ResponseEntity<T> response = restTemplate.exchange(
					url,
					HttpMethod.GET,
					entity,
					responseType
					);

			return response.getBody();
		} catch (Exception e) {
			throw new RuntimeException("Failed to execute GET request to: " + url, e);
		}
	}

	/**
	 * Make a POST request to an external API
	 *
	 * @param url The full endpoint URL
	 * @param headers Optional headers (e.g., Authorization, Content-Type)
	 * @param body The request body
	 * @param responseType The expected response class type
	 * @return The response object
	 */
	public <T> T post(String url, Map<String, String> headers, Object body, Class<T> responseType) {
		try {
			HttpHeaders httpHeaders = createHeaders(headers);
			HttpEntity<Object> entity = new HttpEntity<>(body, httpHeaders);

			ResponseEntity<T> response = restTemplate.exchange(
					url,
					HttpMethod.POST,
					entity,
					responseType
					);

			return response.getBody();
		} catch (Exception e) {
			throw new RuntimeException("Failed to execute POST request to: " + url, e);
		}
	}

	/**
	 * Make a PUT request to an external API
	 *
	 * @param url The full endpoint URL
	 * @param headers Optional headers (e.g., Authorization, Content-Type)
	 * @param body The request body
	 * @param responseType The expected response class type
	 * @return The response object
	 */
	public <T> T put(String url, Map<String, String> headers, Object body, Class<T> responseType) {
		try {
			HttpHeaders httpHeaders = createHeaders(headers);
			HttpEntity<Object> entity = new HttpEntity<>(body, httpHeaders);

			ResponseEntity<T> response = restTemplate.exchange(
					url,
					HttpMethod.PUT,
					entity,
					responseType
					);

			return response.getBody();
		} catch (Exception e) {
			throw new RuntimeException("Failed to execute PUT request to: " + url, e);
		}
	}
}
