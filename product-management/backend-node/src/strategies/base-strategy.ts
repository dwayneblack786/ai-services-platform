// Base Strategy Interface

import { VoiceRequest, VoiceResponse, StrategyType } from '../orchestrator/types';

export abstract class BaseVoiceStrategy {
  protected strategyType: StrategyType;

  constructor(strategyType: StrategyType) {
    this.strategyType = strategyType;
  }

  abstract process(request: VoiceRequest): Promise<VoiceResponse>;

  abstract getName(): string;

  abstract isAvailable(): Promise<boolean>;

  getType(): StrategyType {
    return this.strategyType;
  }

  protected createResponse(
    request: VoiceRequest,
    partial: Partial<VoiceResponse>
  ): VoiceResponse {
    return {
      sessionId: request.sessionId,
      ...partial,
      metadata: {
        strategy: this.strategyType,
        latency: 0,
        provider: this.getName(),
        ...partial.metadata
      }
    };
  }
}
