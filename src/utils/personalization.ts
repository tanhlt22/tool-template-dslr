import { FrameElement } from '../types/canvas';

export interface PersonalizationData {
  brideName: string;
  groomName: string;
  weddingDate: string;
  galleryUrl: string;
  eventName: string;
}

export const DEFAULT_PERSONALIZATION: PersonalizationData = {
  brideName: 'Thuỳ Trang',
  groomName: 'Quốc Huy',
  weddingDate: '30.12.2026',
  galleryUrl: 'https://picadesign.vn/gallery',
  eventName: 'Happy Wedding Day'
};

export function personalizeText(content: string, data: PersonalizationData): string {
  const coupleName = `${data.brideName} & ${data.groomName}`;
  let next = content
    .replace(/\{bride\}/gi, data.brideName)
    .replace(/\{groom\}/gi, data.groomName)
    .replace(/\{couple\}/gi, coupleName)
    .replace(/\{date\}/gi, data.weddingDate)
    .replace(/\{event\}/gi, data.eventName)
    .replace(/\{galleryUrl\}/gi, data.galleryUrl);

  const upper = next.toUpperCase();
  if (
    upper.includes('MINH & LAN') ||
    upper.includes('TEN CO DAU') ||
    upper.includes('TÊN CÔ DÂU') ||
    upper.includes('CO DAU & CHU RE') ||
    upper.includes('CÔ DÂU & CHÚ RỂ') ||
    upper.includes('TEN CO DAU & CHU RE') ||
    upper.includes('TÊN CÔ DÂU & CHÚ RỂ')
  ) {
    next = coupleName;
  } else if (
    upper.includes('30.05.2026') ||
    upper.includes('30.12.2026') ||
    upper.includes('00.00.0000') ||
    upper.includes('NGAY TO CHUC') ||
    upper.includes('NGÀY TỔ CHỨC')
  ) {
    next = data.weddingDate;
  } else if (upper.includes('HAPPY WEDDING DAY') || upper.includes('HAPPY WEDDING')) {
    next = `${data.eventName}: ${coupleName}`;
  }

  return next;
}

export function applyPersonalizationToElements(
  elements: FrameElement[],
  data: PersonalizationData
): FrameElement[] {
  return elements.map((element) => {
    if (element.type === 'text') {
      return {
        ...element,
        content: personalizeText(element.content, data)
      };
    }

    if (element.type === 'qr' && (!element.content || element.content === 'https://lumibooth.com' || element.content === 'https://haivustudio.com' || element.content === 'https://picadesign.vn')) {
      return {
        ...element,
        content: data.galleryUrl
      };
    }

    return element;
  });
}
