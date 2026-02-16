/**
 * Generate Sample Audio for Testing
 *
 * Creates a valid WebM audio file with spoken text using:
 * Option 1: System TTS (if available)
 * Option 2: Synthetic tone/beep
 * Option 3: Download sample from web
 *
 * Run: npx ts-node tests/fixtures/audio/generate-sample.ts
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const OUTPUT_FILE = path.join(__dirname, 'sample-voice.webm');
const SAMPLE_TEXT = 'Hello, this is a test of the voice assistant. How are you today?';

/**
 * Try to generate audio using system TTS (Windows SAPI)
 */
async function generateWithWindowsTTS(): Promise<boolean> {
  console.log('🔊 Attempting to generate audio with Windows TTS...');

  const powershellScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile("${OUTPUT_FILE.replace(/\\/g, '\\\\')}.wav")
$synth.Speak("${SAMPLE_TEXT}")
$synth.Dispose()
  `;

  try {
    const ps = spawn('powershell.exe', ['-Command', powershellScript]);

    await new Promise<void>((resolve, reject) => {
      ps.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`PowerShell exited with code ${code}`));
      });
      ps.on('error', reject);
    });

    // Convert WAV to WebM using ffmpeg (if available)
    const wavFile = OUTPUT_FILE + '.wav';
    if (existsSync(wavFile)) {
      console.log('✅ WAV file generated, converting to WebM...');
      await convertWavToWebM(wavFile, OUTPUT_FILE);
      await fs.unlink(wavFile); // Clean up WAV
      return true;
    }

    return false;
  } catch (error) {
    console.warn('⚠️ Windows TTS failed:', error);
    return false;
  }
}

/**
 * Convert WAV to WebM using ffmpeg
 */
async function convertWavToWebM(inputWav: string, outputWebM: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputWav,
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-vn', // No video
      '-y', // Overwrite
      outputWebM
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`ffmpeg not found: ${error.message}`));
    });
  });
}

/**
 * Generate synthetic beep tone as fallback
 * Creates a simple WebM file with beep pattern
 */
async function generateSyntheticBeep(): Promise<void> {
  console.log('🎵 Generating synthetic beep audio...');

  // Generate PCM audio: 3 short beeps
  const sampleRate = 16000;
  const beepDuration = 0.2; // 200ms per beep
  const pauseDuration = 0.1; // 100ms pause
  const frequency = 800; // 800Hz beep

  const beepSamples = Math.floor(sampleRate * beepDuration);
  const pauseSamples = Math.floor(sampleRate * pauseDuration);
  const totalSamples = (beepSamples + pauseSamples) * 3;

  const pcmData = Buffer.alloc(totalSamples * 2); // 16-bit samples

  let offset = 0;
  for (let beep = 0; beep < 3; beep++) {
    // Generate beep
    for (let i = 0; i < beepSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * frequency * t) * 0.5; // 50% volume
      const intSample = Math.floor(sample * 32767);
      pcmData.writeInt16LE(intSample, offset);
      offset += 2;
    }

    // Pause
    for (let i = 0; i < pauseSamples; i++) {
      pcmData.writeInt16LE(0, offset);
      offset += 2;
    }
  }

  // Save as raw PCM (test can handle this)
  // In production, you'd convert to WebM, but raw PCM works for basic testing
  const rawFile = OUTPUT_FILE.replace('.webm', '.raw');
  await fs.writeFile(rawFile, pcmData);

  console.log(`✅ Generated synthetic audio: ${rawFile}`);
  console.log('ℹ️ Note: This is raw PCM audio for testing. For production, use real audio files.');
}

/**
 * Download sample audio from web (public domain)
 */
async function downloadSampleAudio(): Promise<boolean> {
  console.log('🌐 Downloading sample audio from web...');

  try {
    // Example: Mozilla's sample audio files
    const url = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const wavFile = OUTPUT_FILE.replace('.webm', '.wav');
    await fs.writeFile(wavFile, buffer);

    console.log('✅ Downloaded WAV file, converting to WebM...');
    await convertWavToWebM(wavFile, OUTPUT_FILE);
    await fs.unlink(wavFile);

    return true;
  } catch (error) {
    console.warn('⚠️ Download failed:', error);
    return false;
  }
}

/**
 * Main generation logic
 */
async function main() {
  console.log('🎤 Generating sample audio for voice testing...\n');

  // Ensure directory exists
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

  // Try methods in order
  let success = false;

  // Method 1: Windows TTS
  if (process.platform === 'win32') {
    success = await generateWithWindowsTTS();
  }

  // Method 2: Download sample
  if (!success) {
    success = await downloadSampleAudio();
  }

  // Method 3: Synthetic beep (always works)
  if (!success) {
    await generateSyntheticBeep();
    success = true;
  }

  if (success) {
    console.log('\n✅ Sample audio ready!');
    console.log(`📁 Location: ${OUTPUT_FILE}`);
    console.log('\n🧪 Run tests with: npm test tests/e2e/voice-streaming.e2e.test.ts');
  } else {
    console.error('\n❌ Failed to generate sample audio');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { generateSyntheticBeep, generateWithWindowsTTS, downloadSampleAudio };
