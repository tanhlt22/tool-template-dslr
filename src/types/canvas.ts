export interface FrameSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  order: number;
  placeholderColor?: string;
  locked?: boolean;
  visible?: boolean;
}

export interface ElementStyle {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  order?: number;
  fontWeight?: string;
  fontStyle?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface FrameElement {
  id: string;
  type: 'text' | 'icon' | 'image' | 'qr';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  style?: ElementStyle;
  locked?: boolean;
  visible?: boolean;
  lockRatio?: boolean;
  aspectRatio?: number;
  fileName?: string;
}

export interface FrameConfig {
  id?: string;
  name: string;
  width: number;
  height: number;
  backgroundPrompt?: string;
  backgroundImageUrl?: string | null;
  slots: FrameSlot[];
  elements: FrameElement[];
}

export type CanvasTool = 'select' | 'slot' | 'text' | 'sticker' | 'qr' | 'image';
