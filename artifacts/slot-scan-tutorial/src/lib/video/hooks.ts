import { useEffect, useRef, useState } from 'react';

export interface VideoPlayerOptions {
  totalDuration: number;
  onComplete?: () => void;
}

export function useVideoPlayer({ totalDuration, onComplete }: VideoPlayerOptions) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const updateScene = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = elapsed / totalDuration;

      if (progress >= 1) {
        // Loop back to beginning
        startTimeRef.current = timestamp;
        setCurrentScene(0);
        onComplete?.();
      }

      animationFrameRef.current = requestAnimationFrame(updateScene);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateScene);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration, onComplete]);

  useEffect(() => {
    // Auto-start on mount
    setIsPlaying(true);
    
    // Hook for external recording trigger
    if (typeof window !== 'undefined') {
      (window as any).startRecording = () => {
        startTimeRef.current = 0;
        setCurrentScene(0);
        setIsPlaying(true);
      };
      
      (window as any).stopRecording = () => {
        setIsPlaying(false);
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).startRecording;
        delete (window as any).stopRecording;
      }
    };
  }, []);

  return {
    currentScene,
    setCurrentScene,
    isPlaying,
  };
}
