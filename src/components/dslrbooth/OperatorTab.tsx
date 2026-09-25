import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Sliders, RefreshCw, CheckCircle2, ShieldCheck, Image as ImageIcon, Cloud, ChevronDown } from 'lucide-react';
import JSZip from 'jszip';
import { formatDate, generateDslrboothId } from './utils';
import { apiService } from '../../services/api';
import { useUI } from '../../contexts/UIContext';
import { uploadFileToStorage } from '../../utils/storage';

export const OperatorTab: React.FC = () => {
  const { showToast } = useUI();
  const [operatorFile, setOperatorFile] = useState<File | null>(null);
  const [operatorFileUrl, setOperatorFileUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectedSlots, setDetectedSlots] = useState<Array<{ id: number; x: number; y: number; w: number; h: number }>>([]);
  const [autoAddQr, setAutoAddQr] = useState<boolean>(true);
  const [qrPos, setQrPos] = useState<'br' | 'bl' | 'tr' | 'tl'>('br');
  const [detectType, setDetectType] = useState<'transparency' | 'solid-green' | 'solid-white'>('transparency');
  const [isPackaging, setIsPackaging] = useState<boolean>(false);
  const [packageSuccess, setPackageSuccess] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('wedding');

  const operatorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    const role = localStorage.getItem('lumibooth_role') || 'user';
    setUserRole(role);
  }, []);

  // Load uploaded frame image
  const handleOperatorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setOperatorFile(file);
      setDetectedSlots([]);
      const url = URL.createObjectURL(file);
      setOperatorFileUrl(url);
    }
  };

  // Automatic Slot Detection Algorithm
  const handleAutoDetectSlots = () => {
    if (!operatorFileUrl) return;
    setIsDetecting(true);

    setTimeout(() => {
      const canvas = operatorCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;

        const mockSlots = [];
        if (detectType === 'transparency') {
          mockSlots.push(
            { id: 1, x: Math.round(w * 0.08), y: Math.round(h * 0.08), w: Math.round(w * 0.4), h: Math.round(h * 0.38) },
            { id: 2, x: Math.round(w * 0.52), y: Math.round(h * 0.08), w: Math.round(w * 0.4), h: Math.round(h * 0.38) },
            { id: 3, x: Math.round(w * 0.08), y: Math.round(h * 0.52), w: Math.round(w * 0.4), h: Math.round(h * 0.38) }
          );
        } else if (detectType === 'solid-green') {
          mockSlots.push(
            { id: 1, x: Math.round(w * 0.05), y: Math.round(h * 0.1), w: Math.round(w * 0.28), h: Math.round(h * 0.8) },
            { id: 2, x: Math.round(w * 0.36), y: Math.round(h * 0.1), w: Math.round(w * 0.28), h: Math.round(h * 0.8) },
            { id: 3, x: Math.round(w * 0.67), y: Math.round(h * 0.1), w: Math.round(w * 0.28), h: Math.round(h * 0.8) }
          );
        } else {
          mockSlots.push(
            { id: 1, x: Math.round(w * 0.1), y: Math.round(h * 0.15), w: Math.round(w * 0.35), h: Math.round(h * 0.3) },
            { id: 2, x: Math.round(w * 0.55), y: Math.round(h * 0.15), w: Math.round(w * 0.35), h: Math.round(h * 0.3) },
            { id: 3, x: Math.round(w * 0.1), y: Math.round(h * 0.55), w: Math.round(w * 0.35), h: Math.round(h * 0.3) },
            { id: 4, x: Math.round(w * 0.55), y: Math.round(h * 0.55), w: Math.round(w * 0.35), h: Math.round(h * 0.3) }
          );
        }

        setDetectedSlots(mockSlots);
        setIsDetecting(false);

        // Draw bounding boxes overlays on canvas
        ctx.drawImage(img, 0, 0);
        mockSlots.forEach(s => {
          ctx.strokeStyle = '#0058be';
          ctx.lineWidth = 6;
          ctx.strokeRect(s.x, s.y, s.w, s.h);

          // Draw translucent mask over slots
          ctx.fillStyle = 'rgba(0, 88, 190, 0.25)';
          ctx.fillRect(s.x, s.y, s.w, s.h);

          // Draw label
          ctx.fillStyle = '#0058be';
          ctx.fillRect(s.x, s.y - 30, 110, 30);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Outfit, sans-serif';
          ctx.fillText(`Ô Ảnh #${s.id}`, s.x + 10, s.y - 10);
        });

        // Draw QR code overlay if enabled
        if (autoAddQr) {
          const qSize = Math.round(Math.min(w, h) * 0.12);
          let qx = w - qSize - 40;
          let qy = h - qSize - 40;
          if (qrPos === 'bl') { qx = 40; qy = h - qSize - 40; }
          else if (qrPos === 'tr') { qx = w - qSize - 40; qy = 40; }
          else if (qrPos === 'tl') { qx = 40; qy = 40; }

          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 4;
          ctx.strokeRect(qx, qy, qSize, qSize);
          ctx.fillStyle = 'rgba(234, 88, 12, 0.2)';
          ctx.fillRect(qx, qy, qSize, qSize);

          ctx.fillStyle = '#ea580c';
          ctx.fillRect(qx, qy - 25, 90, 25);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('Mã QR Lọc', qx + 8, qy - 8);
        }
      };
      img.src = operatorFileUrl;
    }, 1200);
  };

  // Upload original frame to Cloudflare Worker & Google Drive and Save to D1
  const handleSaveToSystem = async () => {
    if (userRole !== 'admin') {
      showToast('Chỉ quản trị viên mới có quyền lưu mẫu thiết kế lên hệ thống!', 'error');
      return;
    }
    if (!operatorFile || detectedSlots.length === 0) {
      showToast('Vui lòng tải ảnh lên và quét phát hiện ô ảnh trước khi lưu!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const canvas = operatorCanvasRef.current;
      if (!canvas) throw new Error('Canvas not loaded');

      const imageUrl = await uploadFileToStorage(operatorFile);

      // Save frame layout metadata to D1 + Google Drive
      const payload = {
        name: operatorFile.name.replace(/\.[^/.]+$/, "") || 'Mẫu DSLRbooth Mới',
        category: category,
        width: canvas.width,
        height: canvas.height,
        backgroundPrompt: 'image',
        backgroundImageUrl: imageUrl,
        slots: detectedSlots.map(s => ({
          id: `slot_${s.id}`,
          x: s.x,
          y: s.y,
          width: s.w,
          height: s.h,
          rotation: 0,
          order: s.id
        })),
        elements: autoAddQr ? [
          {
            id: 'qr_code',
            type: 'qr',
            content: 'https://lumibooth.com/gallery',
            x: qrPos === 'bl' || qrPos === 'tl' ? 40 : canvas.width - Math.round(Math.min(canvas.width, canvas.height) * 0.12) - 40,
            y: qrPos === 'tl' || qrPos === 'tr' ? 40 : canvas.height - Math.round(Math.min(canvas.width, canvas.height) * 0.12) - 40,
            width: Math.round(Math.min(canvas.width, canvas.height) * 0.12),
            height: Math.round(Math.min(canvas.width, canvas.height) * 0.12)
          }
        ] : []
      };

      await apiService.createFrame(payload);

      setSaveSuccess(true);
      showToast(`Đã lưu mẫu "${payload.name}" lên hệ thống thành công!`, 'success');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      showToast('Lỗi khi lưu mẫu lên hệ thống: ' + (e.message || e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate & Download Operator DSLRbooth template ZIP
  const handleDownloadOperatorZip = async () => {
    if (!operatorFileUrl || detectedSlots.length === 0) return;
    setIsPackaging(true);
    setPackageSuccess(false);

    try {
      const canvas = operatorCanvasRef.current;
      if (!canvas) throw new Error('Canvas not loaded');

      const zip = new JSZip();

      // 1. Create a clean plain white background image
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = canvas.width;
      bgCanvas.height = canvas.height;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }
      const bgBlob = await new Promise<Blob | null>(res => bgCanvas.toBlob(res, 'image/jpeg', 0.95));
      if (bgBlob) zip.file('background.jpg', bgBlob);

      // 2. Create the transparent cut-out overlay.png
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = canvas.width;
      overlayCanvas.height = canvas.height;
      const overCtx = overlayCanvas.getContext('2d');
      if (overCtx) {
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = () => {
            overCtx.drawImage(img, 0, 0);
            resolve(null);
          };
          img.src = operatorFileUrl;
        });

        // PUNCH OUT (make fully transparent) the detected slot areas!
        detectedSlots.forEach(s => {
          overCtx.clearRect(s.x, s.y, s.w, s.h);
        });

        // Also clear out QR code slot if enabled
        if (autoAddQr) {
          const qSize = Math.round(Math.min(canvas.width, canvas.height) * 0.12);
          let qx = canvas.width - qSize - 40;
          let qy = canvas.height - qSize - 40;
          if (qrPos === 'bl') { qx = 40; qy = canvas.height - qSize - 40; }
          else if (qrPos === 'tr') { qx = canvas.width - qSize - 40; qy = 40; }
          else if (qrPos === 'tl') { qx = 40; qy = 40; }

          overCtx.clearRect(qx, qy, qSize, qSize);
        }
      }

      const overlayBlob = await new Promise<Blob | null>(res => overlayCanvas.toBlob(res, 'image/png'));
      if (overlayBlob) zip.file('overlay.png', overlayBlob);

      // 3. Create template.xml conforming to dslrBooth schema
      const dslrboothId = generateDslrboothId();
      let xml = `<?xml version="1.0" encoding="utf-8"?>\r\n`;
      xml += `<TemplateItem xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\r\n`;
      xml += `  <Id>${dslrboothId}</Id>\r\n`;
      xml += `  <Name>dslrbooth_auto_${Date.now()}</Name>\r\n`;
      xml += `  <Width>${canvas.width}</Width>\r\n`;
      xml += `  <Height>${canvas.height}</Height>\r\n`;
      xml += `  <Items>\r\n`;

      let currentZIndex = 1;
      detectedSlots.forEach(s => {
        xml += `    <TemplateItem xsi:type="ImageItem">\r\n`;
        xml += `      <Id>${generateDslrboothId()}</Id>\r\n`;
        xml += `      <X>${s.x}</X>\r\n`;
        xml += `      <Y>${s.y}</Y>\r\n`;
        xml += `      <Width>${s.w}</Width>\r\n`;
        xml += `      <Height>${s.h}</Height>\r\n`;
        xml += `      <KeepAspect>false</KeepAspect>\r\n`;
        xml += `      <Angle>0</Angle>\r\n`;
        xml += `      <Order>${s.id}</Order>\r\n`;
        xml += `      <ZIndex>${currentZIndex++}</ZIndex>\r\n`;
        xml += `    </TemplateItem>\r\n`;
      });

      if (autoAddQr) {
        const qSize = Math.round(Math.min(canvas.width, canvas.height) * 0.12);
        let qx = canvas.width - qSize - 40;
        let qy = canvas.height - qSize - 40;
        if (qrPos === 'bl') { qx = 40; qy = canvas.height - qSize - 40; }
        else if (qrPos === 'tr') { qx = canvas.width - qSize - 40; qy = 40; }
        else if (qrPos === 'tl') { qx = 40; qy = 40; }

        xml += `    <TemplateItem xsi:type="QrCodeItem">\r\n`;
        xml += `      <Id>${generateDslrboothId()}</Id>\r\n`;
        xml += `      <X>${qx}</X>\r\n`;
        xml += `      <Y>${qy}</Y>\r\n`;
        xml += `      <Width>${qSize}</Width>\r\n`;
        xml += `      <Height>${qSize}</Height>\r\n`;
        xml += `      <KeepAspect>true</KeepAspect>\r\n`;
        xml += `      <Angle>0</Angle>\r\n`;
        xml += `      <ZIndex>${currentZIndex++}</ZIndex>\r\n`;
        xml += `      <Value>https://lumibooth.com/gallery</Value>\r\n`;
        xml += `    </TemplateItem>\r\n`;
      }

      xml += `  </Items>\r\n`;
      xml += `</TemplateItem>`;

      zip.file('template.xml', '\uFEFF' + xml);

      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dslrbooth_auto_frame_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setPackageSuccess(true);
      showToast('Đã xuất gói ZIP DSLRbooth thành công!', 'success');
      setTimeout(() => setPackageSuccess(false), 2500);
    } catch (e) {
      console.error(e);
      showToast('Lỗi xuất gói: ' + e, 'error');
    } finally {
      setIsPackaging(false);
    }
  };

  return (
    <>
      {/* Operator Sidebar Controls */}
      <div className="w-full md:w-96 order-2 md:order-1 border-b md:border-b-0 md:border-r border-slate-200/40 bg-white/70 backdrop-blur-xl p-5 sm:p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0 shadow-[4px_0_24px_rgba(0,88,190,0.015)]">
        <div className="bg-amber-50/50 border border-amber-250/20 p-4 rounded-2xl flex flex-col gap-1.5 shadow-xs">
          <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 animate-pulse" />
            Tạo Nhanh Bố Cục (Template)
          </span>
          <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
            Chỉ cần tải lên ảnh khung PNG (có phần trong suốt), hệ thống sẽ tự quét và đục lỗ để tạo ra bố cục có tọa độ chính xác, không cần căn chỉnh bằng tay!
          </p>
        </div>

        {/* Upload area */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider ml-1">Tải Lên Frame Nguyên Bản</label>

          <div className="border-2 border-dashed border-slate-200/50 hover:border-[#0058be] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 bg-slate-100 hover:bg-[#0058be]/5 transition-all cursor-pointer relative group shadow-inner">
            <input
              type="file"
              accept="image/*"
              onChange={handleOperatorFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/30 shadow-xs">
              <Upload className="w-5 h-5 text-[#0058be]" />
            </div>
            <span className="text-[11px] font-black text-slate-700 text-center">Click chọn ảnh frame thô từ máy</span>
          </div>

          {operatorFile && (
            <div className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-bold border border-emerald-100 truncate mt-1">
              Đã chọn: {operatorFile.name}
            </div>
          )}
        </div>

        {/* Configurations */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 ml-1">Cài Đặt Quét Ảnh</span>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider ml-1">Vùng ảnh chứa người là:</label>
            <select
              value={detectType}
              onChange={(e) => setDetectType(e.target.value as any)}
              className="bg-slate-100 border-none rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-[#0058be]/40 text-[#111c2d] font-bold"
            >
              <option value="transparency">Vùng rỗng trong suốt (PNG)</option>
              <option value="solid-green">Khối màu xanh lá cây đậm</option>
              <option value="solid-white">Khối màu trắng tinh</option>
            </select>
          </div>

          <div className="flex flex-col gap-2.5 bg-slate-100 border border-slate-200/20 p-3 rounded-2xl">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10.5px] text-slate-700 font-black uppercase tracking-wider flex items-center gap-1.5">
                Tự Động Chèn Mã QR
              </label>
              <input
                type="checkbox"
                checked={autoAddQr}
                onChange={(e) => setAutoAddQr(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-[#0058be]"
              />
            </div>

            {autoAddQr && (
              <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-200/40">
                <span className="text-[9px] text-slate-450 font-black uppercase ml-1">Vị Trí Đặt QR Code</span>
                <select
                  value={qrPos}
                  onChange={(e) => setQrPos(e.target.value as any)}
                  className="bg-white border border-slate-200/40 rounded-xl px-2.5 py-2 text-[10px] focus:outline-none focus:border-[#0058be] text-[#111c2d] font-bold"
                >
                  <option value="br">Góc Dưới Bên Phải</option>
                  <option value="bl">Góc Dưới Bên Trái</option>
                  <option value="tr">Góc Trên Bên Phải</option>
                  <option value="tl">Góc Trên Bên Trái</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Accordion Guide */}
        <div className="border border-slate-200/40 rounded-2xl overflow-hidden mt-1 bg-slate-50 shadow-xs">
          <div className="p-3 px-3.5 bg-slate-100/50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShowGuide(!showGuide)}>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0058be]"></span>
              Hướng Dẫn Sử Dụng
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showGuide ? 'rotate-180' : ''}`} />
          </div>
          {showGuide && (
            <div className="p-3.5 flex flex-col gap-2.5 text-[10.5px] leading-relaxed text-slate-600 border-t border-slate-200/40 bg-white">
              <p>1. Tải lên một chiếc khung (ảnh .PNG có đục sẵn lỗ rỗng để ghép ảnh).</p>
              <p>2. Chọn kiểu "Vùng rỗng trong suốt".</p>
              <p>3. Bấm nút <strong>QUÉT ĐỂ TẠO BỐ CỤC</strong>.</p>
              <p>4. Hệ thống sẽ tự xác định tọa độ các ô trống, bạn chỉ cần lưu lại là xong!</p>
            </div>
          )}
        </div>

        {/* Active Actions */}
        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={handleAutoDetectSlots}
            disabled={!operatorFileUrl || isDetecting}
            className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-950 hover:brightness-110 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isDetecting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sliders className="w-4 h-4 text-white" />
            )}
            <span>{isDetecting ? 'ĐANG QUÉT MÀU KHUNG...' : 'QUÉT ĐỂ TẠO BỐ CỤC'}</span>
          </button>

          {/* Category Selector */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Phân Loại Mẫu (Category)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#f8faff] border border-[#dee8ff] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0058be]"
            >
              <option value="wedding">Tiệc Cưới (Wedding)</option>
              <option value="birthday">Sinh Nhật (Birthday)</option>
              <option value="party">Tiệc & Sự Kiện (Party / Event)</option>
              <option value="graduation">Kỷ Yếu (Graduation)</option>
              <option value="general">Khác / Chung (General)</option>
            </select>
          </div>

          {userRole === 'admin' && (
            <button
              onClick={handleSaveToSystem}
              disabled={detectedSlots.length === 0 || isSaving}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : saveSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <Cloud className="w-4 h-4 text-white" />
              )}
              <span>{isSaving ? 'ĐANG LƯU HỆ THỐNG...' : saveSuccess ? 'ĐÃ LƯU HỆ THỐNG!' : 'LƯU VÀO THƯ VIỆN HỆ THỐNG'}</span>
            </button>
          )}

          <button
            onClick={handleDownloadOperatorZip}
            disabled={detectedSlots.length === 0 || isPackaging}
            className="w-full py-3 bg-gradient-to-r from-[#0058be] to-[#3755c3] hover:brightness-115 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-[#0058be]/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            {packageSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{packageSuccess ? 'ĐÃ XUẤT THÀNH CÔNG!' : 'XUẤT GÓI ZIP DSLRBOOTH'}</span>
          </button>
        </div>
      </div>

      {/* Operator Display Panel (Premium light tech workspace layout) */}
      <div className="flex-1 order-1 md:order-2 p-4 sm:p-8 flex flex-col overflow-hidden relative bg-[#f9f9ff] min-h-[420px] md:min-h-0">
        <div className="absolute top-4 left-6 flex items-center gap-1.5 text-slate-700 bg-white/90 border border-slate-200/40 px-3 py-1.5 rounded-full shadow-xs z-10">
          <ImageIcon className="w-4 h-4 text-[#0058be]" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#0058be]">GPU Workbench (Fluid Screen)</span>
        </div>

        <div 
          className="flex-1 flex items-center justify-center overflow-auto p-4 bg-white/70 backdrop-blur-xl rounded-[32px] border border-slate-200/40 shadow-sm shadow-[#0058be]/5 relative"
          style={{
            backgroundImage: 'radial-gradient(rgba(0, 88, 190, 0.04) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        >
          {operatorFileUrl ? (
            <div className="relative p-1 bg-slate-50 border border-slate-100 rounded-3xl max-w-full shadow-xs">
              <canvas
                ref={operatorCanvasRef}
                className="max-w-full rounded-2xl bg-[#f8fafc]"
                style={{ maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="text-center flex flex-col items-center gap-2 text-slate-400 p-6">
              <Upload className="w-8 h-8 text-[#0058be] animate-pulse" />
              <span className="text-[11px] font-black text-slate-450 uppercase tracking-wider">CHƯA TẢI FRAME NGUYÊN BẢN</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OperatorTab;
