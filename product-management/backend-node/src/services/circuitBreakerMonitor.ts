/**
 * Circuit Breaker Monitoring Service
 * 
 * Provides periodic health checks and logging for all registered circuit breakers
 * Also performs proactive health checks to detect service failures early
 */

import { getCircuitBreakerStats } from './circuitBreaker';
import { javaVAClient } from './apiClient';
import logger from '../utils/logger';

let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic circuit breaker monitoring with health checks
 * @param intervalMs - How often to check circuit breaker health (default: 30 seconds)
 * @param performHealthChecks - Whether to actively health-check services (default: true)
 */
export function startCircuitBreakerMonitoring(
  intervalMs: number = 30000,
  performHealthChecks: boolean = true
): void {
  if (monitoringInterval) {
    console.log('[CB Monitor] Circuit breaker monitoring already running');
    return;
  }

  console.log(`[CB Monitor] 🔍 Starting circuit breaker monitoring (every ${intervalMs/1000}s)`);
  if (performHealthChecks) {
    console.log('[CB Monitor] 🏥 Proactive health checks enabled');
  }
  
  monitoringInterval = setInterval(async () => {
    const timestamp = new Date().toISOString();
    
    // Perform proactive health check if enabled
    if (performHealthChecks) {
      try {
        console.log(`[CB Monitor] 🏥 Performing health check on Java VA service...`);
        const healthResult = await javaVAClient.get('/health', undefined, () => ({
          status: 'unavailable',
          message: 'Circuit breaker fallback - service down'
        }));
        
        if (healthResult.data.status === 'UP') {
          console.log('[CB Monitor] ✅ Health check passed - Service is UP');
        } else {
          console.log('[CB Monitor] ⚠️ Health check warning - Service status:', healthResult.data.status);
        }
      } catch (error: any) {
        console.log('[CB Monitor] ❌ Health check failed:', error.message);
        logger.warn('Proactive health check failed', { error: error.message });
      }
    }
    
    const stats = getCircuitBreakerStats();
    
    console.log('\n' + '='.repeat(80));
    console.log(`[CB Monitor] 📊 Circuit Breaker Status Check - ${timestamp}`);
    console.log('='.repeat(80));
    
    let hasUnhealthyCircuits = false;
    
    for (const [name, circuitStats] of Object.entries(stats)) {
      const stateEmoji = 
        circuitStats.state === 'CLOSED' ? '🟢' :
        circuitStats.state === 'HALF_OPEN' ? '🟡' : '🔴';
      
      console.log(`\n[${name}] ${stateEmoji} State: ${circuitStats.state}`);
      console.log(`  Total Requests: ${circuitStats.totalRequests}`);
      console.log(`  Failures: ${circuitStats.failureCount}`);
      console.log(`  Successes: ${circuitStats.successCount}`);
      
      if (circuitStats.lastSuccessTime) {
        const timeSinceSuccess = Date.now() - circuitStats.lastSuccessTime;
        console.log(`  Last Success: ${Math.round(timeSinceSuccess / 1000)}s ago`);
      } else {
        console.log(`  Last Success: Never`);
      }
      
      if (circuitStats.lastFailureTime) {
        const timeSinceFailure = Date.now() - circuitStats.lastFailureTime;
        console.log(`  Last Failure: ${Math.round(timeSinceFailure / 1000)}s ago`);
      }
      
      if (circuitStats.nextAttemptTime) {
        const timeUntilRetry = circuitStats.nextAttemptTime - Date.now();
        console.log(`  Next Retry: in ${Math.round(timeUntilRetry / 1000)}s`);
      }
      
      // Warn if circuit is not healthy
      if (circuitStats.state !== 'CLOSED') {
        hasUnhealthyCircuits = true;
        logger.warn(`Circuit breaker ${name} is ${circuitStats.state}`, { stats: circuitStats });
      }
    }
    
    if (!hasUnhealthyCircuits) {
      console.log('\n✅ All circuit breakers are healthy (CLOSED state)');
    } else {
      console.log('\n⚠️  Some circuit breakers are not healthy - check logs above');
    }
    
    console.log('='.repeat(80) + '\n');
  }, intervalMs);
}

/**
 * Stop circuit breaker monitoring
 */
export function stopCircuitBreakerMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('[CB Monitor] Circuit breaker monitoring stopped');
  }
}

/**
 * Get current monitoring status
 */
export function isMonitoring(): boolean {
  return monitoringInterval !== null;
}
