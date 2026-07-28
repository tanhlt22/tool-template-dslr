import { AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '../../lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

// Scene durations in milliseconds
export const SCENE_DURATIONS = [3000, 3000, 3200, 3000, 3000];
const TOTAL_DURATION = SCENE_DURATIONS.reduce((a, b) => a + b, 0);

export function VideoTemplate() {
  const { currentScene, setCurrentScene } = useVideoPlayer({
    totalDuration: TOTAL_DURATION,
  });

  // Auto-advance scenes based on durations
  React.useEffect(() => {
    const duration = SCENE_DURATIONS[currentScene];
    const timer = setTimeout(() => {
      const nextScene = (currentScene + 1) % SCENE_DURATIONS.length;
      setCurrentScene(nextScene);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [currentScene, setCurrentScene]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-50">
      {/* Persistent background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-rose-50/30 to-slate-100" />
      
      {/* Scenes */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="scene1" />}
        {currentScene === 1 && <Scene2 key="scene2" />}
        {currentScene === 2 && <Scene3 key="scene3" />}
        {currentScene === 3 && <Scene4 key="scene4" />}
        {currentScene === 4 && <Scene5 key="scene5" />}
      </AnimatePresence>
    </div>
  );
}

// Import React for useState/useEffect
import * as React from 'react';
