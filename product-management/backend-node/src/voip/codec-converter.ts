// Audio Codec Converter - G.711 (µ-law/A-law) ↔ Opus/PCM

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('codec-converter');

export type SupportedCodec = 'opus' | 'pcmu' | 'pcma' | 'g729' | 'pcm';

export interface ConversionOptions {
  sourceCodec: SupportedCodec;
  targetCodec: SupportedCodec;
  sampleRate?: number;
  channels?: number;
}

export class CodecConverter {
  /**
   * Convert audio between codecs
   * Note: Full implementation requires native codec libraries (libopus, speex, etc.)
   * For now, this provides the interface and basic PCM conversions
   */
  static async convert(
    input: Buffer,
    options: ConversionOptions
  ): Promise<Buffer> {
    const { sourceCodec, targetCodec, sampleRate = 16000, channels = 1 } = options;

    logger.debug('Converting audio', {
      sourceCodec,
      targetCodec,
      inputSize: input.length,
      sampleRate,
      channels
    });

    // Same codec - no conversion needed
    if (sourceCodec === targetCodec) {
      return input;
    }

    try {
      // Convert source to PCM first (intermediate format)
      let pcmData: Buffer;

      switch (sourceCodec) {
        case 'pcm':
          pcmData = input;
          break;
        case 'pcmu':
          pcmData = this.mulawToPCM(input);
          break;
        case 'pcma':
          pcmData = this.alawToPCM(input);
          break;
        case 'opus':
        case 'g729':
          // Requires native libraries (libopus, libg729)
          throw new Error(`${sourceCodec} decoding requires native library`);
        default:
          throw new Error(`Unsupported source codec: ${sourceCodec}`);
      }

      // Convert PCM to target codec
      switch (targetCodec) {
        case 'pcm':
          return pcmData;
        case 'pcmu':
          return this.pcmToMulaw(pcmData);
        case 'pcma':
          return this.pcmToAlaw(pcmData);
        case 'opus':
        case 'g729':
          // Requires native libraries
          throw new Error(`${targetCodec} encoding requires native library`);
        default:
          throw new Error(`Unsupported target codec: ${targetCodec}`);
      }
    } catch (error) {
      logger.error('Codec conversion failed', {
        sourceCodec,
        targetCodec,
        error
      });
      throw error;
    }
  }

  /**
   * G.711 µ-law to PCM (16-bit signed)
   */
  private static mulawToPCM(mulaw: Buffer): Buffer {
    const pcm = Buffer.alloc(mulaw.length * 2); // 16-bit PCM

    for (let i = 0; i < mulaw.length; i++) {
      const mulawByte = mulaw[i];
      const sign = (mulawByte & 0x80) >> 7;
      const exponent = (mulawByte & 0x70) >> 4;
      const mantissa = mulawByte & 0x0F;

      let pcmValue = ((mantissa << 3) + 0x84) << exponent;
      if (sign === 0) {
        pcmValue = -pcmValue;
      }

      pcm.writeInt16LE(pcmValue, i * 2);
    }

    return pcm;
  }

  /**
   * G.711 A-law to PCM (16-bit signed)
   */
  private static alawToPCM(alaw: Buffer): Buffer {
    const pcm = Buffer.alloc(alaw.length * 2);

    for (let i = 0; i < alaw.length; i++) {
      const alawByte = alaw[i] ^ 0x55; // XOR with 0x55
      const sign = (alawByte & 0x80) >> 7;
      const exponent = (alawByte & 0x70) >> 4;
      const mantissa = alawByte & 0x0F;

      let pcmValue: number;
      if (exponent === 0) {
        pcmValue = (mantissa << 4) + 8;
      } else {
        pcmValue = ((mantissa << 4) + 0x108) << (exponent - 1);
      }

      if (sign === 0) {
        pcmValue = -pcmValue;
      }

      pcm.writeInt16LE(pcmValue, i * 2);
    }

    return pcm;
  }

  /**
   * PCM (16-bit signed) to G.711 µ-law
   */
  private static pcmToMulaw(pcm: Buffer): Buffer {
    const mulaw = Buffer.alloc(pcm.length / 2);

    for (let i = 0; i < mulaw.length; i++) {
      const pcmValue = pcm.readInt16LE(i * 2);
      mulaw[i] = this.linearToMulaw(pcmValue);
    }

    return mulaw;
  }

  /**
   * PCM (16-bit signed) to G.711 A-law
   */
  private static pcmToAlaw(pcm: Buffer): Buffer {
    const alaw = Buffer.alloc(pcm.length / 2);

    for (let i = 0; i < alaw.length; i++) {
      const pcmValue = pcm.readInt16LE(i * 2);
      alaw[i] = this.linearToAlaw(pcmValue);
    }

    return alaw;
  }

  private static linearToMulaw(pcm: number): number {
    const MULAW_MAX = 0x1FFF;
    const MULAW_BIAS = 33;

    let sign = (pcm >> 8) & 0x80;
    if (sign !== 0) {
      pcm = -pcm;
    }

    if (pcm > MULAW_MAX) {
      pcm = MULAW_MAX;
    }

    pcm += MULAW_BIAS;

    let exponent = 7;
    for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; exponent--) {
      expMask >>= 1;
    }

    const mantissa = (pcm >> (exponent + 3)) & 0x0F;
    const mulawByte = ~(sign | (exponent << 4) | mantissa);

    return mulawByte & 0xFF;
  }

  private static linearToAlaw(pcm: number): number {
    const ALAW_MAX = 0x1FFF;

    let sign = (pcm >> 8) & 0x80;
    if (sign !== 0) {
      pcm = -pcm;
    }

    if (pcm > ALAW_MAX) {
      pcm = ALAW_MAX;
    }

    let exponent = 7;
    for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; exponent--) {
      expMask >>= 1;
    }

    const mantissa = (pcm >> (exponent + 3)) & 0x0F;
    const alawByte = sign | (exponent << 4) | mantissa;

    return alawByte ^ 0x55;
  }

  /**
   * Check if codec conversion is supported
   */
  static isConversionSupported(from: SupportedCodec, to: SupportedCodec): boolean {
    const supportedPairs = [
      ['pcm', 'pcmu'],
      ['pcm', 'pcma'],
      ['pcmu', 'pcm'],
      ['pcma', 'pcm'],
      ['pcmu', 'pcma'],
      ['pcma', 'pcmu']
    ];

    if (from === to) return true;

    return supportedPairs.some(
      ([s, t]) => (s === from && t === to) || (s === to && t === from)
    );
  }
}
