import JSZip from 'jszip';
import { FrameConfig, FrameElement, FrameSlot } from '../types/canvas';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export async function importDslrboothZip(file: File): Promise<Partial<FrameConfig>> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  const xmlFile = loadedZip.file('template.xml');
  if (!xmlFile) {
    throw new Error('Không tìm thấy template.xml trong gói ZIP');
  }
  
  const xmlContent = await xmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const templateNode = xmlDoc.querySelector('Template');
  if (!templateNode) {
    throw new Error('File XML không hợp lệ');
  }

  const name = templateNode.getAttribute('Name') || 'Untitled';
  const widthStr = templateNode.getAttribute('Width');
  const heightStr = templateNode.getAttribute('Height');
  
  const width = widthStr ? parseInt(widthStr, 10) : 1200;
  const height = heightStr ? parseInt(heightStr, 10) : 1800;
  
  let backgroundColor = '#ffffff';
  const bgAttr = templateNode.getAttribute('BackgroundColor');
  if (bgAttr && bgAttr.length >= 7) {
    // #AARRGGBB -> #RRGGBB
    if (bgAttr.length === 9) {
      backgroundColor = '#' + bgAttr.substring(3);
    } else {
      backgroundColor = bgAttr;
    }
  }

  const slots: FrameSlot[] = [];
  const elements: FrameElement[] = [];
  let bgImageUrl: string | null = null;
  let bgType: 'color' | 'image' = 'color';

  const photoNodes = xmlDoc.querySelectorAll('Photo');
  photoNodes.forEach((node) => {
    const pw = parseFloat(node.getAttribute('Width') || '0');
    const ph = parseFloat(node.getAttribute('Height') || '0');
    const pt = parseFloat(node.getAttribute('Top') || '0');
    const pl = parseFloat(node.getAttribute('Left') || '0');
    const pr = parseFloat(node.getAttribute('Rotation') || '0');
    const order = node.getAttribute('PhotoNumber') || '1';
    
    // In dslrbooth, top/left is top-left corner without rotation.
    // We need to calculate cx, cy.
    const theta = (pr * Math.PI) / 180;
    const cx = pl + pw / 2;
    const cy = pt + ph / 2;
    
    const x = cx - (pw / 2) * Math.cos(theta) + (ph / 2) * Math.sin(theta);
    const y = cy - (pw / 2) * Math.sin(theta) - (ph / 2) * Math.cos(theta);

    slots.push({
      id: generateId(),
      x,
      y,
      width: pw,
      height: ph,
      rotation: pr,
      order: parseInt(order, 10),
      visible: true
    });
  });

  const imageNodes = Array.from(xmlDoc.querySelectorAll('Image'));
  
  // Background
  const bgNode = imageNodes.find(node => node.getAttribute('ImagePath') === 'background.jpg');
  if (bgNode) {
    const bgFile = loadedZip.file('background.jpg');
    if (bgFile) {
      const blob = await bgFile.async('blob');
      bgImageUrl = URL.createObjectURL(blob);
      bgType = 'image';
    }
  }

  // Overlay
  const overlayNode = imageNodes.find(node => node.getAttribute('ImagePath') === 'overlay.png');
  if (overlayNode) {
    const overlayFile = loadedZip.file('overlay.png');
    if (overlayFile) {
      const blob = await overlayFile.async('blob');
      elements.push({
        id: 'overlay_' + generateId(),
        type: 'image',
        content: URL.createObjectURL(blob),
        x: 0,
        y: 0,
        width: width,
        height: height,
        rotation: 0,
        visible: true
      });
    }
  }

  // QrCode
  const qrNodes = xmlDoc.querySelectorAll('QrCode');
  qrNodes.forEach((node) => {
    const qw = parseFloat(node.getAttribute('Width') || '0');
    const qh = parseFloat(node.getAttribute('Height') || '0');
    const qt = parseFloat(node.getAttribute('Top') || '0');
    const ql = parseFloat(node.getAttribute('Left') || '0');
    const qrRot = parseFloat(node.getAttribute('Rotation') || '0');
    
    const theta = (qrRot * Math.PI) / 180;
    const cx = ql + qw / 2;
    const cy = qt + qh / 2;
    const x = cx - (qw / 2) * Math.cos(theta) + (qh / 2) * Math.sin(theta);
    const y = cy - (qw / 2) * Math.sin(theta) - (qh / 2) * Math.cos(theta);
    
    elements.push({
      id: 'qr_' + generateId(),
      type: 'qr',
      content: 'https://lumibooth.com/gallery',
      x,
      y,
      width: qw,
      height: qh,
      rotation: qrRot,
      visible: true
    });
  });

  return {
    name,
    width,
    height,
    backgroundPrompt: bgType,
    backgroundImageUrl: bgImageUrl,
    slots,
    elements
  };
}
