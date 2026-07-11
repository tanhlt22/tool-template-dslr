import React, { useState, useRef, useEffect } from 'react';
import { Download, Check, RefreshCw, CheckCircle2, Wand2, Calendar, User, Layout } from 'lucide-react';
import JSZip from 'jszip';
import { useUI } from '../../contexts/UIContext';
import { TEMPLATES, formatDate, generateDslrboothId } from './utils';
import { apiService } from '../../services/api';

export const CoupleTab: React.FC = () => {
  const [brideName, setBrideName] = useState<string>('Thùy Trang');
  const [groomName, setGroomName] = useState<string>('Quốc Huy');
  const [weddingDate, setWeddingDate] = useState<string>('30.12.2026');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | string>(1);
  const [isPackaging, setIsPackaging] = useState<boolean>(false);
  const { showToast } = useUI();
  const [packageSuccess, setPackageSuccess] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [templateDetails, setTemplateDetails] = useState<Record<string, any>>({});

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load dynamic templates from Supabase
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getFrames();
        setTemplates(data);
      } catch (err) {
        console.error('Failed to load dynamic templates:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  // Combine legacy templates with loaded templates from database
  const allTemplates = [
    ...TEMPLATES,
    ...templates
  ];

  const isLegacy = typeof selectedTemplateId === 'number';
  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId) || allTemplates[0];
  const currentTemplate = !isLegacy && templateDetails[String(selectedTemplateId)]
    ? templateDetails[String(selectedTemplateId)]
    : selectedTemplate;

  useEffect(() => {
    if (isLegacy || !selectedTemplate?.id || !selectedTemplate.is_list_item || templateDetails[String(selectedTemplate.id)]) {
      return;
    }

    let cancelled = false;
    apiService.getFrame(String(selectedTemplate.id))
      .then((detail) => {
        if (!cancelled) {
          setTemplateDetails((prev) => ({ ...prev, [String(selectedTemplate.id)]: detail }));
        }
      })
      .catch((err) => {
        console.error('Failed to load template detail:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isLegacy, selectedTemplate?.id, selectedTemplate?.is_list_item, templateDetails]);

  // Draw couple template preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isLegacy) {
      // Legacy templates (1200x1200px)
      canvas.width = 1200;
      canvas.height = 1200;
      ctx.clearRect(0, 0, 1200, 1200);

      // 1. Draw Background
      if (currentTemplate.bgType === 'gradient' && currentTemplate.bgGrad) {
        const grad = ctx.createLinearGradient(0, 0, 1200, 1200);
        if (selectedTemplateId === 1) {
          grad.addColorStop(0, '#fff5f8');
          grad.addColorStop(1, '#f3e8ff');
        } else {
          grad.addColorStop(0, '#f0fdf4');
          grad.addColorStop(1, '#dcfce7');
        }
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = currentTemplate.bgColor || '#ffffff';
      }
      ctx.fillRect(0, 0, 1200, 1200);

      // 2. Draw decorative border
      ctx.strokeStyle = currentTemplate.borderColor;
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, 1140, 1140);

      // Inner thin border
      ctx.strokeStyle = currentTemplate.borderColor + '55';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, 1104, 1104);

      // 3. Draw slots
      currentTemplate.slots.forEach((s: any) => {
        ctx.fillStyle = selectedTemplateId === 2 ? '#1e293b' : '#f8fafc';
        ctx.fillRect(s.x, s.y, s.w, s.h);

        ctx.strokeStyle = currentTemplate.borderColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(s.x, s.y, s.w, s.h);

        ctx.fillStyle = currentTemplate.textColor + '33';
        ctx.font = 'bold 36px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`SLOT CHỤP #${s.id}`, s.x + s.w / 2, s.y + s.h / 2);
      });

      // 4. Draw QR Code Placeholder
      const qr = currentTemplate.qr;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qr.x, qr.y, qr.w, qr.h);
      ctx.strokeStyle = currentTemplate.borderColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(qr.x, qr.y, qr.w, qr.h);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(qr.x + 10, qr.y + 10, 35, 35);
      ctx.fillRect(qr.x + qr.w - 45, qr.y + 10, 35, 35);
      ctx.fillRect(qr.x + 10, qr.y + qr.h - 45, 35, 35);
      ctx.fillRect(qr.x + qr.w - 45, qr.y + qr.h - 45, 15, 15);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR LINK', qr.x + qr.w / 2, qr.y + qr.h / 2 + 25);

      // 5. Draw Dynamic Text
      ctx.fillStyle = currentTemplate.textColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const calligraphy = currentTemplate.calligraphyFont === 'Pacifico'
        ? "42px 'Pacifico', cursive"
        : currentTemplate.calligraphyFont === 'Great Vibes'
          ? "56px 'Great Vibes', cursive"
          : "bold 34px 'Outfit', sans-serif";

      ctx.font = calligraphy;
      const coupleText = `${brideName} & ${groomName}`;
      ctx.fillText(coupleText, 85, 930);

      ctx.font = "bold 22px 'Outfit', sans-serif";
      ctx.fillStyle = currentTemplate.textColor + 'cc';
      ctx.fillText(weddingDate, 85, 985);

      ctx.font = "italic 16px 'Outfit', sans-serif";
      ctx.fillStyle = currentTemplate.textColor + '88';
      ctx.fillText('Happy Wedding Day - Cảm ơn quý khách đã chung vui!', 85, 1025);
    } else {
      // Dynamic templates from DB
      const width = currentTemplate.width || 1200;
      const height = currentTemplate.height || 1200;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const renderAll = (bgImageElement?: HTMLImageElement) => {
        ctx.clearRect(0, 0, width, height);

        // 1. Background
        if (bgImageElement) {
          ctx.drawImage(bgImageElement, 0, 0, width, height);
        } else {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, width, height);
        }

        // 2. Draw slots
        const slots = currentTemplate.slots || [];
        slots.forEach((s: any) => {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(s.x, s.y, s.width, s.height);

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 3;
          ctx.strokeRect(s.x, s.y, s.width, s.height);

          ctx.fillStyle = '#64748b';
          ctx.font = `bold ${Math.max(14, Math.round(Math.min(s.width, s.height) * 0.08))}px Outfit, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Ô CHỤP #${s.order || s.id}`, s.x + s.width / 2, s.y + s.height / 2);
        });

        // 3. Draw elements (Text, Sticker, QR)
        const elements = currentTemplate.elements || [];
        elements.forEach((el: any) => {
          if (el.type === 'text') {
            let content = el.content || '';

            // Smart replacement for couple names and date placeholders
            const uppercaseContent = content.toUpperCase();
            if (
              uppercaseContent.includes('MINH & LAN') ||
              uppercaseContent.includes('TÊN CÔ DÂU') ||
              uppercaseContent.includes('Tên Cô Dâu & Chú Rể') ||
              uppercaseContent.includes('CO DAU & CHU RE') ||
              (uppercaseContent.includes('&') && (uppercaseContent.includes('TÊN') || uppercaseContent.includes('NAME') || uppercaseContent.includes('ĐÁM CƯỚI')))
            ) {
              content = `${brideName} & ${groomName}`;
            } else if (
              uppercaseContent.includes('30.05.2026') ||
              uppercaseContent.includes('30.12.2026') ||
              uppercaseContent.includes('NGÀY TỔ CHỨC') ||
              uppercaseContent.includes('NGAY TO CHUC') ||
              uppercaseContent.includes('DATE') ||
              uppercaseContent.includes('00.00.0000')
            ) {
              content = weddingDate;
            } else if (uppercaseContent.includes('HAPPY WEDDING DAY') || uppercaseContent.includes('HAPPY WEDDING')) {
              content = `Happy Wedding: ${brideName} & ${groomName}`;
            }

            ctx.fillStyle = el.style?.color || '#000000';
            const fontSize = el.style?.fontSize || 24;
            const fontFamily = el.style?.fontFamily || 'Outfit';
            const fontWeight = el.style?.fontWeight || 'bold';

            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillText(content, el.x + el.width / 2, el.y + el.height / 2);
          } else if (el.type === 'qr') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.strokeRect(el.x, el.y, el.width, el.height);

            ctx.fillStyle = '#0f172a';
            const qSize = el.width;
            const sizeBox = Math.round(qSize * 0.25);
            ctx.fillRect(el.x + 5, el.y + 5, sizeBox, sizeBox);
            ctx.fillRect(el.x + qSize - sizeBox - 5, el.y + 5, sizeBox, sizeBox);
            ctx.fillRect(el.x + 5, el.y + qSize - sizeBox - 5, sizeBox, sizeBox);
          } else if (el.type === 'icon' || el.type === 'image') {
            if (el.content) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.drawImage(img, el.x, el.y, el.width, el.height);
              };
              img.src = el.content;
            }
          }
        });
      };

      // Initial white layout placeholder
      renderAll();

      // Load remote background image dynamically
      if (currentTemplate.background_image_url) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.onload = () => {
          renderAll(bgImg);
        };
        bgImg.src = currentTemplate.background_image_url;
      }
    }
  }, [brideName, groomName, weddingDate, selectedTemplateId, currentTemplate, isLegacy]);

  // Handle download DSLRbooth ZIP for both legacy and dynamic templates
  const handleDownloadCoupleZip = async () => {
    setIsPackaging(true);
    setPackageSuccess(false);

    try {
      const canvas = previewCanvasRef.current;
      if (!canvas) throw new Error('Preview canvas not loaded');

      const width = isLegacy ? 1200 : (currentTemplate.width || 1200);
      const height = isLegacy ? 1200 : (currentTemplate.height || 1200);

      // Create ZIP structure
      const zip = new JSZip();

      // 1. Export background.jpg
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = width;
      bgCanvas.height = height;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        if (isLegacy) {
          if (currentTemplate.bgType === 'gradient') {
            const grad = bgCtx.createLinearGradient(0, 0, 1200, 1200);
            if (selectedTemplateId === 1) {
              grad.addColorStop(0, '#fff5f8');
              grad.addColorStop(1, '#f3e8ff');
            } else {
              grad.addColorStop(0, '#f0fdf4');
              grad.addColorStop(1, '#dcfce7');
            }
            bgCtx.fillStyle = grad;
          } else {
            bgCtx.fillStyle = currentTemplate.bgColor || '#ffffff';
          }
          bgCtx.fillRect(0, 0, 1200, 1200);
        } else {
          // Dynamic template background from DB
          if (currentTemplate.background_image_url) {
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            await new Promise((resolve) => {
              bgImg.onload = () => {
                bgCtx.drawImage(bgImg, 0, 0, width, height);
                resolve(null);
              };
              bgImg.onerror = () => resolve(null);
              bgImg.src = currentTemplate.background_image_url;
            });
          } else {
            bgCtx.fillStyle = '#ffffff';
            bgCtx.fillRect(0, 0, width, height);
          }
        }
      }
      const bgBlob = await new Promise<Blob | null>(res => bgCanvas.toBlob(res, 'image/jpeg', 0.95));
      if (bgBlob) zip.file('background.jpg', bgBlob);

      // 2. Export overlay.png
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = width;
      overlayCanvas.height = height;
      const overCtx = overlayCanvas.getContext('2d');
      if (overCtx) {
        overCtx.drawImage(canvas, 0, 0);

        // Clear slot areas (punching transparent holes!)
        if (isLegacy) {
          currentTemplate.slots.forEach((s: any) => {
            overCtx.clearRect(s.x, s.y, s.w, s.h);
          });
          const qr = currentTemplate.qr;
          overCtx.clearRect(qr.x, qr.y, qr.w, qr.h);
        } else {
          const slots = currentTemplate.slots || [];
          slots.forEach((s: any) => {
            overCtx.clearRect(s.x, s.y, s.width, s.height);
          });

          // Clear QR code area too
          const elements = currentTemplate.elements || [];
          elements.forEach((el: any) => {
            if (el.type === 'qr') {
              overCtx.clearRect(el.x, el.y, el.width, el.height);
            }
          });
        }
      }
      const overBlob = await new Promise<Blob | null>(res => overlayCanvas.toBlob(res, 'image/png'));
      if (overBlob) zip.file('overlay.png', overBlob);

      // 3. Generate template.xml (DSLRbooth Native Format)
      const xmlDate = formatDate();
      const xmlId = generateDslrboothId();

      // Gather slots and QR info
      let allSlots: Array<{id: number; x: number; y: number; w: number; h: number}> = [];
      let qrElement: {x: number; y: number; width: number; height: number} | null = null;

      if (isLegacy) {
        allSlots = currentTemplate.slots.map((s: any) => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h }));
        qrElement = { x: currentTemplate.qr.x, y: currentTemplate.qr.y, width: currentTemplate.qr.w, height: currentTemplate.qr.h };
      } else {
        const slots = currentTemplate.slots || [];
        allSlots = slots.map((s: any, idx: number) => ({ id: s.order || idx + 1, x: s.x, y: s.y, w: s.width, h: s.height }));
        const elements = currentTemplate.elements || [];
        const qrEl = elements.find((el: any) => el.type === 'qr');
        if (qrEl) {
          qrElement = { x: qrEl.x, y: qrEl.y, width: qrEl.width, height: qrEl.height };
        }
      }

      const photoCount = allSlots.length;
      const overlayZIndex = photoCount;
      const qrZIndex = photoCount + 1;

      // BOM (EF BB BF) bắt buộc cho .NET XML parser của DSLRbooth
      let xmlStr = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\r\n`;
      xmlStr += `<Template Name="dslrbooth_${groomName}_${brideName}" Width="${width}" Height="${height}" Dimensions="0" Resolution="300" BackgroundColor="#FFFFFFFF" print_2_per_page="False" PrintToSecondaryPrinter="False" LastSavedDate="${xmlDate}" Id="${xmlId}" IsLegacy="False" OriginalDevice="DESKTOP-HAIVUSTUDIO">\r\n`;
      xmlStr += `  <Elements>\r\n`;

      // QrCode element (trên cùng)
      if (qrElement) {
        xmlStr += `    <QrCode Name="QR Code" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" UseUploadUrl="True" Width="${Math.round(qrElement.width)}" Height="${Math.round(qrElement.height)}" BackgroundColor="#00FFFFFF" ZIndex="${qrZIndex}" Left="${Math.round(qrElement.x)}" Top="${Math.round(qrElement.y)}" />\r\n`;
      }

      // Overlay (ZIndex = photoCount)
      xmlStr += `    <Image Name="overlay" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${width}" Height="${height}" Top="0" Left="0" ImagePath="overlay.png" KeepAspect="True" Thickness="0" StrokeColor="#FF000000" ZIndex="${overlayZIndex}" Rotation="0" />\r\n`;

      // Photos: list theo thứ tự ZIndex giảm dần, ZIndex = PhotoNumber (1-based)
      [...allSlots]
        .sort((a, b) => b.id - a.id)
        .forEach((s) => {
          xmlStr += `    <Photo Name="Photo ${s.id}" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${Math.round(s.w)}" Height="${Math.round(s.h)}" Top="${Math.round(s.y)}" Left="${Math.round(s.x)}" ImagePath="" KeepAspect="True" Thickness="0" StrokeColor="#FF000000" PhotoNumber="${s.id}" ZIndex="${s.id}" />\r\n`;
        });

      // Background (ZIndex 0 — dưới cùng)
      xmlStr += `    <Image Name="background" IsVisible="True" Opacity="100" ShadowEnabled="False" ShadowColor="#FF000000" ShadowDepth="10" ShadowRadius="20" ShadowDirection="-45" Width="${width}" Height="${height}" Top="0" Left="0" ImagePath="background.jpg" KeepAspect="True" Thickness="0" StrokeColor="#FF000000" ZIndex="0" Rotation="0" />\r\n`;

      xmlStr += `  </Elements>\r\n`;
      xmlStr += `</Template>\r\n`;
      zip.file('template.xml', xmlStr);

      // DEFLATE compression (method=8) — bắt buộc theo format DSLRbooth
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dslrbooth_${groomName}_${brideName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setPackageSuccess(true);
      setTimeout(() => setPackageSuccess(false), 2500);
    } catch (e) {
      console.error(e);
      showToast('Không thể đóng gói ZIP: ' + e, 'error');
    } finally {
      setIsPackaging(false);
    }
  };

  return (
    <>
      {/* Control Form Sidebar */}
      <div className="w-full md:w-96 order-2 md:order-1 border-b md:border-b-0 md:border-r border-[#dee8ff]/50 bg-white p-5 sm:p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0 shadow-[4px_0_24px_rgba(0,88,190,0.015)]">
        <div className="bg-gradient-to-br from-[#f0f3ff] to-[#f6f8ff] border border-[#dee8ff]/70 p-4.5 rounded-3xl flex flex-col gap-2 shadow-sm">
          <span className="text-[10px] font-black text-[#0058be] uppercase tracking-widest flex items-center gap-1">
            <Wand2 className="w-3.5 h-3.5 animate-bounce" />
            Khách Hàng Tự Điền (Mobile OK)
          </span>
          <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed">
            Khách hàng dễ dàng tự nhập tên, ngày cưới ngay tại đám cưới hoặc sự kiện. Hệ thống tự động tạo gói ZIP tải về và gửi trực tiếp cho bạn!
          </p>
        </div>

        {/* Text Fields */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            1. Nhập Thông Tin In Lên Khung
          </span>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Tên Cô Dâu (Bride)</label>
            <input
              type="text"
              value={brideName}
              onChange={(e) => setBrideName(e.target.value)}
              placeholder="Nhập tên Cô Dâu..."
              className="w-full px-3.5 py-3 bg-[#f8faff] border border-[#dee8ff] hover:border-slate-300 focus:border-[#0058be] rounded-2xl text-xs font-black focus:outline-none focus:ring-4 focus:ring-[#0058be]/5 transition-all animate-fade-in"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Tên Chú Rể (Groom)</label>
            <input
              type="text"
              value={groomName}
              onChange={(e) => setGroomName(e.target.value)}
              placeholder="Nhập tên Chú Rể..."
              className="w-full px-3.5 py-3 bg-[#f8faff] border border-[#dee8ff] hover:border-slate-300 focus:border-[#0058be] rounded-2xl text-xs font-black focus:outline-none focus:ring-4 focus:ring-[#0058be]/5 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Ngày Tổ Chức (Wedding Date)
            </label>
            <input
              type="text"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              placeholder="Ví dụ: 30.12.2026..."
              className="w-full px-3.5 py-3 bg-[#f8faff] border border-[#dee8ff] hover:border-slate-300 focus:border-[#0058be] rounded-2xl text-xs font-black focus:outline-none focus:ring-4 focus:ring-[#0058be]/5 transition-all"
            />
          </div>
        </div>

        {/* Template Picker */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1">
            <Layout className="w-3.5 h-3.5 text-slate-400" />
            2. Chọn Mẫu Thiết Kế Khung
          </span>

          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#0058be]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Đang tải các mẫu thiết kế...</span>
              </div>
            ) : (
              allTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`text-left p-4 rounded-3xl border transition-all flex flex-col gap-2 relative overflow-hidden group hover:scale-[1.01] ${selectedTemplateId === t.id
                      ? 'border-[#0058be] bg-gradient-to-br from-[#0058be]/5 to-[#2170e4]/2 shadow-xs'
                      : 'border-[#dee8ff]/80 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[12px] font-black tracking-wide ${selectedTemplateId === t.id ? 'text-[#0058be]' : 'text-slate-800'}`}>
                      {t.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-white" style={{ background: t.borderColor || (t.id === 'template_korean_strip' ? '#ec4899' : '#0058be') }} />
                      {selectedTemplateId === t.id && (
                        <div className="bg-[#0058be] text-white p-0.5 rounded-full">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10.5px] text-slate-450 font-semibold leading-normal">
                    {t.desc || `Bố cục thiết kế cao cấp • Kích thước: ${t.width}x${t.height}px • Số ô chụp: ${t.slots?.length || 0}`}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Interactive Import Instruction Accordion */}
        <div className="border border-[#dee8ff] rounded-2xl overflow-hidden mt-2 bg-slate-50">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-200/50 text-left flex justify-between items-center text-xs font-black text-slate-700 transition-all focus:outline-none"
          >
            <span className="flex items-center gap-1.5">
              📖 Hướng dẫn Import vào DSLRbooth
            </span>
            <span className="text-slate-400 font-bold">{showGuide ? 'Ẩn' : 'Xem'}</span>
          </button>
          {showGuide && (
            <div className="p-4 flex flex-col gap-3.5 text-[11px] leading-relaxed text-slate-600 border-t border-[#dee8ff] bg-white">
              <div className="flex gap-2">
                <span className="bg-[#0058be]/10 text-[#0058be] w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-black">1</span>
                <p><strong>Xuất file ZIP:</strong> Bấm nút màu xanh bên dưới để tải về tệp ZIP đóng gói chuẩn.</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-[#0058be]/10 text-[#0058be] w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-black">2</span>
                <p><strong>Giải nén:</strong> Giải nén tệp ZIP trên máy tính (sẽ ra file <code>background.jpg</code>, <code>overlay.png</code>, <code>template.xml</code> & <code>template.json</code>).</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-[#0058be]/10 text-[#0058be] w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-black">3</span>
                <p><strong>Nạp 1-Click:</strong> Mở phần mềm <strong>DSLRbooth</strong> (hoặc LumaBooth) -&gt; Vào mục <strong>Templates</strong> (Mẫu) -&gt; Click <strong>Import</strong> (Nhập) -&gt; Chọn file <code>template.xml</code>. Phần mềm sẽ tự động lấy đúng coordinates các ô ảnh chụp cực chuẩn!</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleDownloadCoupleZip}
          disabled={isPackaging || isLoading}
          className="w-full mt-auto py-3.5 bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:from-[#004b9e] hover:to-[#175cc0] text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2.5 shadow-lg shadow-[#0058be]/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
        >
          {packageSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 animate-bounce" />
              <span>ĐÃ TẢI XUỐNG ZIP DSLRBOOTH!</span>
            </>
          ) : isPackaging ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>ĐANG ĐÓNG GÓI ZIP...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-white" />
              <span>TẢI TỆP .ZIP NATIVE DSLRBOOTH</span>
            </>
          )}
        </button>
      </div>

      {/* Live Canvas Preview Panel (Fully fluid mockup for responsive sizing) */}
      <div className="flex-1 order-1 md:order-2 p-4 sm:p-8 flex items-center justify-center overflow-auto bg-[#f1f4fb] min-h-[420px] md:min-h-0">
        <div className="relative p-4 sm:p-7 bg-white rounded-[32px] sm:rounded-[40px] shadow-[0_20px_50px_rgba(0,88,190,0.06)] border border-[#dee8ff]/50 flex flex-col items-center w-full max-w-[500px]">

          {/* iPad camera dot */}
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200 absolute top-3 left-1/2 -translate-x-1/2" />

          <div className="w-full aspect-square bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-1 shadow-inner relative flex items-center justify-center">
            <canvas
              ref={previewCanvasRef}
              className="w-full aspect-square rounded-xl shadow-xs bg-white"
              style={{ maxWidth: '100%', maxHeight: '420px' }}
            />
          </div>

          <div className="w-24 h-1 rounded-full bg-slate-200 mt-4" />
        </div>
      </div>
    </>
  );
};
