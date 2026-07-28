import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
    >
      {/* Step indicator */}
      <motion.div
        className="flex items-center gap-[2vw] mb-[5vh]"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-[5vw] h-[5vw] rounded-full bg-rose-800 flex items-center justify-center shadow-xl">
          <span className="text-white font-bold text-[2.5vw]">5</span>
        </div>
        <div className="text-left">
          <p className="text-[3vw] font-bold text-slate-900">Xuất File PNG</p>
          <p className="text-[1.6vw] text-slate-600 font-semibold">Lưu frame hoàn chỉnh</p>
        </div>
      </motion.div>

      {/* Export button and file illustration */}
      <motion.div
        className="flex items-center gap-[6vw]"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Export button */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.5 }}
        >
          <button className="px-[5vw] py-[2.5vh] bg-rose-800 text-white rounded-lg shadow-xl text-[1.8vw] font-bold flex items-center gap-[1vw]">
            <span className="text-[2vw]">💾</span>
            <span>XUẤT PNG</span>
          </button>
        </motion.div>

        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 3 ? { 
            opacity: 1, 
            x: [0, 10, 0],
          } : { opacity: 0, x: -20 }}
          transition={{ 
            opacity: { duration: 0.4, delay: 0.3 },
            x: { duration: 1, delay: 0.5, repeat: Infinity },
          }}
        >
          <svg className="w-[4vw] h-[4vw] text-rose-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </motion.div>

        {/* File icon */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.8, x: -30 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: -30 }}
          transition={{ duration: 0.5, delay: 0.4, type: 'spring', stiffness: 250, damping: 20 }}
        >
          <div className="w-[12vw] h-[15vh] bg-white rounded-lg shadow-2xl border-2 border-slate-200 p-[1.5vw] flex flex-col items-center justify-center gap-[1vh]">
            <div className="w-[6vw] h-[6vw] bg-rose-100 rounded flex items-center justify-center">
              <span className="text-[3vw]">🖼️</span>
            </div>
            <div className="text-center">
              <p className="text-[1.2vw] font-bold text-slate-900">frame.png</p>
              <p className="text-[0.9vw] text-slate-500 font-semibold">1920×1080</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Success message */}
      <motion.div
        className="mt-[6vh] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <p className="text-[2.5vw] font-bold text-green-600">✓ Hoàn Thành!</p>
        <p className="text-[1.4vw] text-slate-600 font-semibold mt-[1vh]">
          Frame đã sẵn sàng sử dụng
        </p>
      </motion.div>
    </motion.div>
  );
}
