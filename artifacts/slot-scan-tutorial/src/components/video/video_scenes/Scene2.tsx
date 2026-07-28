import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, x: '20vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-20vw' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-[8vw]">
        {/* Left side: Step indicators */}
        <div className="flex flex-col gap-[3vh]">
          <motion.div
            className="flex items-center gap-[2vw]"
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-[4vw] h-[4vw] rounded-full bg-rose-800 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-[2vw]">1</span>
            </div>
            <div className="text-left">
              <p className="text-[2.2vw] font-bold text-slate-900">Thêm Ảnh Nền</p>
              <p className="text-[1.3vw] text-slate-600 font-semibold">Upload frame PNG</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-[2vw]"
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-[4vw] h-[4vw] rounded-full bg-rose-800 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-[2vw]">2</span>
            </div>
            <div className="text-left">
              <p className="text-[2.2vw] font-bold text-slate-900">Chọn Kiểu Quét</p>
              <p className="text-[1.3vw] text-slate-600 font-semibold">Trong suốt / màu xanh...</p>
            </div>
          </motion.div>
        </div>

        {/* Right side: UI mockup */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.9, rotateY: -15 }}
          transition={{ duration: 0.6, delay: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
          style={{ perspective: '1000px' }}
        >
          {/* Mock UI card */}
          <div className="w-[35vw] bg-white rounded-lg shadow-2xl border-2 border-slate-200 p-[2vw]">
            <div className="flex items-center gap-[1vw] mb-[2vh]">
              <div className="w-[2.5vw] h-[2.5vw] bg-rose-800 rounded" />
              <div className="flex-1 h-[1.5vh] bg-slate-200 rounded" />
            </div>
            
            {/* Upload area */}
            <div className="border-2 border-dashed border-rose-300 rounded-lg p-[3vh] bg-rose-50/50 mb-[2vh]">
              <div className="w-full h-[8vh] bg-gradient-to-br from-rose-100 to-pink-100 rounded flex items-center justify-center">
                <span className="text-[1.5vw] font-bold text-rose-800">📁 Upload Frame</span>
              </div>
            </div>

            {/* Scan type selector */}
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[1vw] p-[1vh] bg-rose-800 text-white rounded-md">
                <div className="w-[1.2vw] h-[1.2vw] bg-white rounded-full" />
                <span className="text-[1.2vw] font-bold">Vùng trong suốt</span>
              </div>
              <div className="flex items-center gap-[1vw] p-[1vh] bg-slate-100 rounded-md">
                <div className="w-[1.2vw] h-[1.2vw] border-2 border-slate-300 rounded-full" />
                <span className="text-[1.2vw] font-semibold text-slate-600">Khối màu xanh</span>
              </div>
            </div>
          </div>

          {/* Cursor animation */}
          <motion.div
            className="absolute w-[2vw] h-[2vw] pointer-events-none"
            initial={{ opacity: 0, x: '15vw', y: '8vh' }}
            animate={phase >= 3 ? {
              opacity: [0, 1, 1],
              x: ['15vw', '18vw', '18vw'],
              y: ['8vh', '12vh', '12vh'],
            } : { opacity: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <div className="w-full h-full bg-rose-800 rounded-full shadow-lg" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
