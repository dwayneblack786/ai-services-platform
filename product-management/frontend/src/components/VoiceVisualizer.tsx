import React, { useEffect, useRef, useState } from 'react';

interface VoiceVisualizerProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
  isPlaying?: boolean;
  height?: number;
  width?: number;
  barColor?: string;
  barCount?: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  audioStream,
  isRecording,
  isPlaying = false,
  height = 60,
  width = 200,
  barColor = '#4f46e5',
  barCount = 20
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const audioContextRef = useRef<AudioContext>();

  // Combined effect for both recording and playing visualizations
  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
      }
    }

    // Recording visualization
    if (audioStream && isRecording && !isPlaying) {
      // Set up audio analyzer
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      analyser.fftSize = 64; // Small for better performance
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Animation loop
      const draw = () => {
        if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Draw bars
        const barWidth = width / barCount;
        const spacing = 2;
        
        for (let i = 0; i < barCount; i++) {
          // Map to data array (sample evenly across the spectrum)
          const dataIndex = Math.floor(i * bufferLength / barCount);
          const value = dataArrayRef.current[dataIndex];
          
          // Normalize and scale
          const barHeight = (value / 255) * height;
          const x = i * barWidth;
          const y = height - barHeight;
          
          // Color based on amplitude
          const intensity = value / 255;
          const color = intensity > 0.7 ? '#ef4444' : 
                        intensity > 0.4 ? '#f59e0b' : 
                        barColor;
          
          ctx.fillStyle = color;
          ctx.fillRect(x + spacing/2, y, barWidth - spacing, barHeight);
        }
        
        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    } 
    // TTS playback visualization
    else if (isPlaying && !isRecording) {
      let phase = 0;
      const drawPlaying = () => {
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        const barWidth = width / barCount;
        const spacing = 2;
        
        for (let i = 0; i < barCount; i++) {
          // Sine wave pattern
          const amplitude = Math.sin(phase + i * 0.3) * 0.5 + 0.5;
          const barHeight = amplitude * height * 0.7;
          const x = i * barWidth;
          const y = (height - barHeight) / 2;
          
          ctx.fillStyle = '#10b981';
          ctx.fillRect(x + spacing/2, y, barWidth - spacing, barHeight);
        }
        
        phase += 0.1;
        animationRef.current = requestAnimationFrame(drawPlaying);
      };

      drawPlaying();
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = undefined;
      }
      analyserRef.current = undefined;
      dataArrayRef.current = undefined;
    };
  }, [audioStream, isRecording, isPlaying, height, width, barColor, barCount]);

  return (
    <canvas 
      ref={canvasRef}
      width={width}
      height={height}
      title={
        isRecording ? 'Real-time audio input visualization - frequency bars show microphone volume' :
        isPlaying ? 'Audio playback visualization - animated waveform shows assistant speaking' :
        'Voice visualizer - shows audio activity when recording or playing'
      }
      style={{
        border: '11px solid #032f88',
        borderRadius: '6px',
        backgroundColor: '#ffffff'
      }}
    />
  );
};

export default VoiceVisualizer;
