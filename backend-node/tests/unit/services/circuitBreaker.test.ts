/**
 * Unit Tests for Circuit Breaker
 * Tests all state transitions and error handling
 */

import { CircuitBreaker, CircuitState } from '../../../src/services/circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  let mockFn: jest.Mock;
  let fallbackFn: jest.Mock;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'TestService',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
      monitoringWindow: 60000
    });

    mockFn = jest.fn();
    fallbackFn = jest.fn();
    
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      const stats = breaker.getStats();
      expect(stats.state).toBe('CLOSED');
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should return circuit state via getState()', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('CLOSED State Operations', () => {
    it('should execute function successfully and remain CLOSED', async () => {
      mockFn.mockResolvedValue('success');

      const result = await breaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should track successful requests', async () => {
      mockFn.mockResolvedValue('ok');

      await breaker.execute(mockFn);
      await breaker.execute(mockFn);

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.failureCount).toBe(0);
      expect(stats.state).toBe('CLOSED');
    });

    it('should track failed requests', async () => {
      mockFn.mockRejectedValue(new Error('Service down'));

      await expect(breaker.execute(mockFn)).rejects.toThrow('Service down');

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(1);
      expect(stats.totalRequests).toBe(1);
    });

    it('should transition to OPEN after failure threshold reached', async () => {
      mockFn.mockRejectedValue(new Error('fail'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(mockFn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe('OPEN');
      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(3);
    });

    it('should reset failure count on success before threshold', async () => {
      mockFn
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      // 2 failures
      await expect(breaker.execute(mockFn)).rejects.toThrow();
      await expect(breaker.execute(mockFn)).rejects.toThrow();
      
      // Then success - should reset
      await breaker.execute(mockFn);

      expect(breaker.getState()).toBe('CLOSED');
      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('OPEN State Operations', () => {
    beforeEach(async () => {
      // Force circuit to OPEN
      mockFn.mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(mockFn)).rejects.toThrow();
      }
      mockFn.mockClear();
    });

    it('should fail fast without calling function', async () => {
      mockFn.mockResolvedValue('success');

      await expect(breaker.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN for TestService');
      
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should use fallback when provided', async () => {
      mockFn.mockResolvedValue('primary');
      fallbackFn.mockResolvedValue('fallback-response');

      const result = await breaker.execute(mockFn, fallbackFn);

      expect(result).toBe('fallback-response');
      expect(mockFn).not.toHaveBeenCalled();
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Advance time past timeout
      jest.advanceTimersByTime(5000);

      mockFn.mockResolvedValue('success');
      await breaker.execute(mockFn);

      expect(breaker.getState()).toBe('HALF_OPEN');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should set nextAttemptTime correctly', () => {
      const stats = breaker.getStats();
      expect(stats.nextAttemptTime).toBeGreaterThan(Date.now());
    });

    it('should track last failure time', () => {
      const stats = breaker.getStats();
      expect(stats.lastFailureTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('HALF_OPEN State Operations', () => {
    beforeEach(async () => {
      // Force to OPEN state
      mockFn.mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(mockFn)).rejects.toThrow();
      }
      
      // Advance time to trigger HALF_OPEN
      jest.advanceTimersByTime(5000);
      mockFn.mockClear();
    });

    it('should transition to CLOSED after success threshold', async () => {
      mockFn.mockResolvedValue('success');

      // Succeed twice (threshold)
      await breaker.execute(mockFn);
      await breaker.execute(mockFn);

      expect(breaker.getState()).toBe('CLOSED');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should re-open circuit on failure', async () => {
      mockFn.mockRejectedValue(new Error('still failing'));

      // First call transitions to HALF_OPEN
      mockFn.mockResolvedValueOnce('success');
      await breaker.execute(mockFn);
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Second call fails - should re-open
      await expect(breaker.execute(mockFn)).rejects.toThrow();

      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reset success count on failure', async () => {
      // One success in HALF_OPEN
      mockFn.mockResolvedValueOnce('ok');
      await breaker.execute(mockFn);
      
      // Then failure - should re-open
      mockFn.mockRejectedValueOnce(new Error('fail'));
      await expect(breaker.execute(mockFn)).rejects.toThrow();

      const stats = breaker.getStats();
      expect(stats.state).toBe('OPEN');
      expect(stats.successCount).toBe(0);
    });
  });

  describe('Stats Tracking', () => {
    it('should track all request metrics', async () => {
      mockFn
        .mockResolvedValueOnce('ok1')
        .mockResolvedValueOnce('ok2')
        .mockRejectedValueOnce(new Error('fail1'))
        .mockResolvedValueOnce('ok3');

      await breaker.execute(mockFn);
      await breaker.execute(mockFn);
      await expect(breaker.execute(mockFn)).rejects.toThrow();
      await breaker.execute(mockFn);

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(4);
      expect(stats.failureCount).toBe(0); // Reset after success
      expect(stats.lastSuccessTime).toBeLessThanOrEqual(Date.now());
      expect(stats.state).toBe('CLOSED');
    });

    it('should return complete stats object', () => {
      const stats = breaker.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('lastFailureTime');
      expect(stats).toHaveProperty('lastSuccessTime');
      expect(stats).toHaveProperty('nextAttemptTime');
    });
  });

  describe('Edge Cases', () => {
    it('should handle async function that resolves immediately', async () => {
      mockFn.mockResolvedValue('immediate');

      const result = await breaker.execute(mockFn);

      expect(result).toBe('immediate');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should handle async function that rejects immediately', async () => {
      mockFn.mockRejectedValue(new Error('immediate fail'));

      await expect(breaker.execute(mockFn)).rejects.toThrow('immediate fail');
      expect(breaker.getState()).toBe('CLOSED'); // Only 1 failure
    });

    it('should handle multiple concurrent requests', async () => {
      mockFn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('ok'), 100))
      );

      const promises = [
        breaker.execute(mockFn),
        breaker.execute(mockFn),
        breaker.execute(mockFn)
      ];

      jest.advanceTimersByTime(100);
      const results = await Promise.all(promises);

      expect(results).toEqual(['ok', 'ok', 'ok']);
      expect(breaker.getStats().totalRequests).toBe(3);
    });

    it('should handle fallback that throws', async () => {
      mockFn.mockRejectedValue(new Error('primary fail'));
      
      // Force to OPEN
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(mockFn)).rejects.toThrow();
      }

      fallbackFn.mockRejectedValue(new Error('fallback fail'));

      await expect(breaker.execute(mockFn, fallbackFn)).rejects.toThrow('fallback fail');
    });

    it('should handle different error types', async () => {
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        'String error',
        { message: 'Object error' }
      ];

      for (const error of errors) {
        const testBreaker = new CircuitBreaker({
          name: 'ErrorTest',
          failureThreshold: 1,
          successThreshold: 1,
          timeout: 1000
        });

        mockFn.mockRejectedValue(error);
        await expect(testBreaker.execute(mockFn)).rejects.toEqual(error);
      }
    });
  });

  describe('Configuration', () => {
    it('should use custom failure threshold', async () => {
      const customBreaker = new CircuitBreaker({
        name: 'Custom',
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 1000
      });

      mockFn.mockRejectedValue(new Error('fail'));

      // Should stay CLOSED until 5 failures
      for (let i = 0; i < 4; i++) {
        await expect(customBreaker.execute(mockFn)).rejects.toThrow();
        expect(customBreaker.getState()).toBe('CLOSED');
      }

      // 5th failure should open
      await expect(customBreaker.execute(mockFn)).rejects.toThrow();
      expect(customBreaker.getState()).toBe('OPEN');
    });

    it('should use custom success threshold', async () => {
      const customBreaker = new CircuitBreaker({
        name: 'Custom',
        failureThreshold: 2,
        successThreshold: 3,
        timeout: 1000
      });

      // Open the circuit
      mockFn.mockRejectedValue(new Error('fail'));
      await expect(customBreaker.execute(mockFn)).rejects.toThrow();
      await expect(customBreaker.execute(mockFn)).rejects.toThrow();
      expect(customBreaker.getState()).toBe('OPEN');

      // Move to HALF_OPEN
      jest.advanceTimersByTime(1000);
      mockFn.mockResolvedValue('ok');

      // Need 3 successes
      await customBreaker.execute(mockFn);
      expect(customBreaker.getState()).toBe('HALF_OPEN');
      
      await customBreaker.execute(mockFn);
      expect(customBreaker.getState()).toBe('HALF_OPEN');
      
      await customBreaker.execute(mockFn);
      expect(customBreaker.getState()).toBe('CLOSED');
    });
  });
});
