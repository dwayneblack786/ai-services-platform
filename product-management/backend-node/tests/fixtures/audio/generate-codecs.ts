// Generate Audio Fixtures for Different Codecs

import * as fs from 'fs/promises';
import * as path from 'path';
import { CodecConverter } from '../../../src/voip/codec-converter';

const OUTPUT_DIR = path.join(__dirname, 'codecs');
const SAMPLE_RATE = 8000; // 8kHz for telephony
const DURATION_MS = 2000; // 2 seconds

async function generatePCMAudio(): Promise<Buffer> {
  // Generate 2 seconds of sine wave (440Hz "A" note)
  const sampleCount = Math.floor((SAMPLE_RATE * DURATION_MS) / 1000);
  const buffer = Buffer.alloc(sampleCount * 2); // 16-bit PCM

  for (let i = 0; i < sampleCount; i++) {
    const t = i / SAMPLE_RATE;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 8000; // 440Hz sine wave
    buffer.writeInt16LE(Math.round(sample), i * 2);
  }

  return buffer;
}

async function generateCodecFixtures(): Promise<void> {
  console.log('🎵 Generating codec test fixtures...\n');

  // Ensure output directory exists
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  try {
    // 1. Generate base PCM audio
    console.log('📊 Generating PCM audio (440Hz sine wave)...');
    const pcmAudio = await generatePCMAudio();
    const pcmPath = path.join(OUTPUT_DIR, 'sample-pcm.raw');
    await fs.writeFile(pcmPath, pcmAudio);
    console.log(`✅ PCM: ${pcmPath} (${pcmAudio.length} bytes)`);

    // 2. Convert to µ-law (G.711)
    console.log('\n📊 Converting to G.711 µ-law...');
    const mulawAudio = await CodecConverter.convert(pcmAudio, {
      sourceCodec: 'pcm',
      targetCodec: 'pcmu',
      sampleRate: SAMPLE_RATE,
      channels: 1
    });
    const mulawPath = path.join(OUTPUT_DIR, 'sample-mulaw.raw');
    await fs.writeFile(mulawPath, mulawAudio);
    console.log(`✅ µ-law: ${mulawPath} (${mulawAudio.length} bytes)`);

    // 3. Convert to A-law (G.711)
    console.log('\n📊 Converting to G.711 A-law...');
    const alawAudio = await CodecConverter.convert(pcmAudio, {
      sourceCodec: 'pcm',
      targetCodec: 'pcma',
      sampleRate: SAMPLE_RATE,
      channels: 1
    });
    const alawPath = path.join(OUTPUT_DIR, 'sample-alaw.raw');
    await fs.writeFile(alawPath, alawAudio);
    console.log(`✅ A-law: ${alawPath} (${alawAudio.length} bytes)`);

    // 4. Create WAV headers for playback
    console.log('\n📊 Creating WAV files with headers...');

    // PCM WAV
    const pcmWav = createWavHeader(pcmAudio, SAMPLE_RATE, 1, 16);
    await fs.writeFile(path.join(OUTPUT_DIR, 'sample-pcm.wav'), pcmWav);
    console.log(`✅ PCM WAV: ${path.join(OUTPUT_DIR, 'sample-pcm.wav')}`);

    console.log('\n✅ All codec fixtures generated!');
    console.log('\n📁 Location: tests/fixtures/audio/codecs/');
    console.log('  - sample-pcm.raw      (16-bit PCM, raw)');
    console.log('  - sample-pcm.wav      (16-bit PCM, with WAV header)');
    console.log('  - sample-mulaw.raw    (G.711 µ-law)');
    console.log('  - sample-alaw.raw     (G.711 A-law)');
  } catch (error) {
    console.error('❌ Error generating fixtures:', error);
    throw error;
  }
}

function createWavHeader(
  audioData: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const dataSize = audioData.length;
  const header = Buffer.alloc(44);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // byte rate
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32); // block align
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, audioData]);
}

// Run if called directly
if (require.main === module) {
  generateCodecFixtures()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { generateCodecFixtures };
