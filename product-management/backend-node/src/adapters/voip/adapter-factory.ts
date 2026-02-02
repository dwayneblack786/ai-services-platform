import { BaseVoipAdapter } from './base-adapter';
import { TwilioAdapter } from './twilio-adapter';
import { VonageAdapter } from './vonage-adapter';
import { BandwidthAdapter } from './bandwidth-adapter';

/**
 * VoIP Adapter Factory
 * Returns the appropriate adapter based on provider name or auto-detection
 */
export class VoipAdapterFactory {
  private static adapters: Map<string, BaseVoipAdapter> = new Map([
    ['twilio', new TwilioAdapter()],
    ['vonage', new VonageAdapter()],
    ['nexmo', new VonageAdapter()], // Alias for Vonage
    ['bandwidth', new BandwidthAdapter()]
  ]);

  /**
   * Get adapter by provider name
   */
  static getAdapter(providerName: string): BaseVoipAdapter {
    const adapter = this.adapters.get(providerName.toLowerCase());
    if (!adapter) {
      throw new Error(`Unsupported VoIP provider: ${providerName}`);
    }
    return adapter;
  }

  /**
   * Auto-detect provider from webhook headers/body
   */
  static detectProvider(requestBody: any, headers: any): BaseVoipAdapter {
    // Twilio detection
    if (requestBody.CallSid || requestBody.AccountSid || headers['x-twilio-signature']) {
      return this.getAdapter('twilio');
    }

    // Vonage detection
    if (requestBody.uuid || requestBody.conversation_uuid || headers['authorization']?.includes('Bearer')) {
      return this.getAdapter('vonage');
    }

    // Bandwidth detection
    if (requestBody.callId && requestBody.applicationId) {
      return this.getAdapter('bandwidth');
    }

    // Default to Twilio if can't detect
    console.warn('[VoIP] Could not auto-detect provider, defaulting to Twilio');
    return this.getAdapter('twilio');
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Register custom adapter
   */
  static registerAdapter(name: string, adapter: BaseVoipAdapter): void {
    this.adapters.set(name.toLowerCase(), adapter);
  }
}
