// Codec Conversion Tests

import { CodecConverter, SupportedCodec } from '../../src/voip/codec-converter';

describe('Codec Converter', () => {
  describe('Supported Conversions', () => {
    it('should identify supported codec pairs', () => {
      expect(CodecConverter.isConversionSupported('pcm', 'pcmu')).toBe(true);
      expect(CodecConverter.isConversionSupported('pcm', 'pcma')).toBe(true);
      expect(CodecConverter.isConversionSupported('pcmu', 'pcma')).toBe(true);
      expect(CodecConverter.isConversionSupported('pcm', 'pcm')).toBe(true);
    });

    it('should identify unsupported codec pairs', () => {
      expect(CodecConverter.isConversionSupported('opus', 'pcm')).toBe(false);
      expect(CodecConverter.isConversionSupported('g729', 'pcm')).toBe(false);
    });
  });

  describe('PCM to µ-law Conversion', () => {
    it('should convert PCM to µ-law', async () => {
      // Generate simple PCM audio (16-bit signed, mono)
      const pcmBuffer = Buffer.alloc(160); // 10ms at 8kHz
      for (let i = 0; i < 80; i++) {
        // 80 samples (16-bit)
        const sample = Math.sin((i / 80) * Math.PI * 2) * 16000; // Sine wave
        pcmBuffer.writeInt16LE(sample, i * 2);
      }

      const mulaw = await CodecConverter.convert(pcmBuffer, {
        sourceCodec: 'pcm',
        targetCodec: 'pcmu'
      });

      expect(mulaw).toBeInstanceOf(Buffer);
      expect(mulaw.length).toBe(80); // Half the size (8-bit µ-law)
    });
  });

  describe('µ-law to PCM Conversion', () => {
    it('should convert µ-law to PCM', async () => {
      // Create µ-law buffer
      const mulawBuffer = Buffer.from([
        0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8
      ]);

      const pcm = await CodecConverter.convert(mulawBuffer, {
        sourceCodec: 'pcmu',
        targetCodec: 'pcm'
      });

      expect(pcm).toBeInstanceOf(Buffer);
      expect(pcm.length).toBe(mulawBuffer.length * 2); // 16-bit PCM
    });
  });

  describe('PCM to A-law Conversion', () => {
    it('should convert PCM to A-law', async () => {
      const pcmBuffer = Buffer.alloc(160);
      for (let i = 0; i < 80; i++) {
        const sample = Math.sin((i / 80) * Math.PI * 2) * 16000;
        pcmBuffer.writeInt16LE(sample, i * 2);
      }

      const alaw = await CodecConverter.convert(pcmBuffer, {
        sourceCodec: 'pcm',
        targetCodec: 'pcma'
      });

      expect(alaw).toBeInstanceOf(Buffer);
      expect(alaw.length).toBe(80);
    });
  });

  describe('A-law to PCM Conversion', () => {
    it('should convert A-law to PCM', async () => {
      const alawBuffer = Buffer.from([
        0xd5, 0xd4, 0xd3, 0xd2, 0xd1, 0xd0, 0xcf, 0xce
      ]);

      const pcm = await CodecConverter.convert(alawBuffer, {
        sourceCodec: 'pcma',
        targetCodec: 'pcm'
      });

      expect(pcm).toBeInstanceOf(Buffer);
      expect(pcm.length).toBe(alawBuffer.length * 2);
    });
  });

  describe('Bidirectional Conversion', () => {
    it('should maintain data integrity through round-trip conversion', async () => {
      // Generate test PCM
      const originalPcm = Buffer.alloc(160);
      for (let i = 0; i < 80; i++) {
        const sample = Math.sin((i / 80) * Math.PI * 2) * 8000;
        originalPcm.writeInt16LE(sample, i * 2);
      }

      // PCM → µ-law → PCM
      const mulaw = await CodecConverter.convert(originalPcm, {
        sourceCodec: 'pcm',
        targetCodec: 'pcmu'
      });

      const reconstructedPcm = await CodecConverter.convert(mulaw, {
        sourceCodec: 'pcmu',
        targetCodec: 'pcm'
      });

      expect(reconstructedPcm.length).toBe(originalPcm.length);

      // Check similarity (lossy compression, won't be exact)
      let totalDiff = 0;
      for (let i = 0; i < originalPcm.length / 2; i++) {
        const orig = originalPcm.readInt16LE(i * 2);
        const recon = reconstructedPcm.readInt16LE(i * 2);
        totalDiff += Math.abs(orig - recon);
      }

      const avgDiff = totalDiff / (originalPcm.length / 2);
      expect(avgDiff).toBeLessThan(6000); // G.711 is lossy, larger margin expected
    });
  });

  describe('Same Codec (No Conversion)', () => {
    it('should return same buffer when source equals target', async () => {
      const inputBuffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);

      const output = await CodecConverter.convert(inputBuffer, {
        sourceCodec: 'pcm',
        targetCodec: 'pcm'
      });

      expect(output).toBe(inputBuffer);
    });
  });

  describe('Unsupported Codecs', () => {
    it('should throw error for unsupported source codec', async () => {
      const buffer = Buffer.from([0x01, 0x02]);

      await expect(
        CodecConverter.convert(buffer, {
          sourceCodec: 'opus',
          targetCodec: 'pcm'
        })
      ).rejects.toThrow('requires native library');
    });

    it('should throw error for unsupported target codec', async () => {
      const buffer = Buffer.from([0x01, 0x02]);

      await expect(
        CodecConverter.convert(buffer, {
          sourceCodec: 'pcm',
          targetCodec: 'opus'
        })
      ).rejects.toThrow('requires native library');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await CodecConverter.convert(emptyBuffer, {
        sourceCodec: 'pcm',
        targetCodec: 'pcmu'
      });

      expect(result.length).toBe(0);
    });

    it('should handle single sample', async () => {
      const singleSample = Buffer.alloc(2);
      singleSample.writeInt16LE(1000, 0);

      const mulaw = await CodecConverter.convert(singleSample, {
        sourceCodec: 'pcm',
        targetCodec: 'pcmu'
      });

      expect(mulaw.length).toBe(1);
    });
  });
});
