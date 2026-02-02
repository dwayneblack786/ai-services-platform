/**
 * @deprecated This file is deprecated. Use apiClient.ts instead.
 * 
 * Legacy file kept for backward compatibility.
 * All new code should import from './apiClient' which includes:
 * - Circuit breaker pattern
 * - Retry logic with exponential backoff
 * - Better error handling
 * - Request/response logging
 */

import { javaVAClient } from './apiClient';

// Export the new client for backward compatibility
export default {
  client: javaVAClient.getAxiosInstance(),
};
