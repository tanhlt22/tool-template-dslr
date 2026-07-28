export interface Slot {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface QRConfig {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Template {
  id: number;
  name: string;
  desc: string;
  bgType: 'gradient' | 'color';
  bgGrad?: string;
  bgColor?: string;
  borderColor: string;
  textColor: string;
  calligraphyFont: string;
  accentColor: string;
  slots: Slot[];
  qr: QRConfig;
}

export interface DSLRboothStudioProps {
  onBackToStudio: () => void;
  onLoadTemplateToStudioAI?: (template: any) => void;
}
