import { useState } from 'react';
import { PAPER_SIZES } from '../constants/templates';

export function useCanvasState() {
  // Canvas Paper & Dimension States
  const [frameName, setFrameName] = useState<string>('My Premium AI Frame');
  const [paperSize, setPaperSize] = useState<string>('4x6');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [width, setWidth] = useState<number>(1200);
  const [height, setHeight] = useState<number>(1800);
  const [resolution, setResolution] = useState<number>(300);

  // Background configurations
  const [prompt, setPrompt] = useState<string>('');
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'ai'>('color');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [bgGradient, setBgGradient] = useState<string>('linear-gradient(135deg, #f0f3ff 0%, #dee8ff 100%)');

  // Grid alignment
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);

  // Paper and print presets synchronizations
  const handlePaperSizeChange = (sizeId: string) => {
    setPaperSize(sizeId);
    const found = PAPER_SIZES.find(p => p.id === sizeId);
    if (found) {
      let newW = found.width;
      let newH = found.height;
      if (orientation === 'horizontal') {
        newW = found.height;
        newH = found.width;
      }
      setWidth(newW);
      setHeight(newH);
    }
  };

  const handleOrientationChange = (orient: 'vertical' | 'horizontal') => {
    setOrientation(orient);
    const prevW = width;
    const prevH = height;
    if ((orient === 'horizontal' && width < height) || (orient === 'vertical' && width > height)) {
      setWidth(prevH);
      setHeight(prevW);
    }
  };

  return {
    // State
    frameName, setFrameName,
    paperSize, setPaperSize,
    orientation, setOrientation,
    width, setWidth,
    height, setHeight,
    resolution, setResolution,
    prompt, setPrompt,
    bgImageUrl, setBgImageUrl,
    backgroundType, setBackgroundType,
    backgroundColor, setBackgroundColor,
    bgGradient, setBgGradient,
    showGrid, setShowGrid,
    snapToGrid, setSnapToGrid,

    // Handlers
    handlePaperSizeChange,
    handleOrientationChange,
  };
}
