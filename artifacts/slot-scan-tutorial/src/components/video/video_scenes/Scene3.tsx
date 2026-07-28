import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
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
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center gap-[6vh]">
        {/* Step indicator */}
        <motion.div
          className="flex items-center gap-[2vw]"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-[5vw] h-[5vw] rounded-full bg-rose-800 flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-[2.5vw]">3</span>
          </div>
          <div className="text-left">
            <p className="text-[3vw] font-bold text-slate-900">Bấm Quét</p>
            <p className="text-[1.6vw] text-slate-600 font-semibold">Nhấn nút "NHẬN DIỆN VỊ TRÍ ẢNH"</p>
          </div>
        </motion.div>

        {/* Big scan button */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 250, damping: 20 }}
        >
          <motion.button
            className="px-[6vw] py-[3vh] bg-rose-800 text-white rounded-lg shadow-2xl text-[2vw] font-bold tracking-wide"
            animate={phase >= 3 ? {
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 20px 50px rgba(159, 18, 57, 0.3)',
                '0 25px 60px rgba(159, 18, 57, 0.5)',
                '0 20px 50px rgba(159, 18, 57, 0.3)',
              ],
            } : {}}
            transition={{ duration: 0.8, delay: 0.3, repeat: 2 }}
          >
            🔍 NHẬN DIỆN VỊ TRÍ ẢNH
          </motion.button>

          {/* Cursor click animation */}
          <motion.div
            className="absolute w-[2.5vw] h-[2.5vw] pointer-events-none"
            initial={{ opacity: 0, x: '8vw', y: '2vh' }}
            animate={phase >= 3 ? {
              opacity: [0, 1, 1, 0],
              scale: [1, 0.9, 0.9, 1.2],
              x: ['8vw', '8vw', '8vw', '8vw'],
              y: ['2vh', '2vh', '2vh', '2vh'],
            } : { opacity: 0 }}
            transition={{ duration: 1.2, delay: 0.4 }}
          >
            <div className="w-full h-full bg-rose-800 rounded-full shadow-lg" />
          </motion.div>

          {/* Click ripple effect */}
          <motion.div
            className="absolute inset-0 rounded-lg border-4 border-rose-800 pointer-events-none"
            initial={{ opacity: 0, scale: 1 }}
            animate={phase >= 3 ? {
              opacity: [0, 0.8, 0],
              scale: [0.95, 1.1, 1.2],
            } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />
        </motion.div>

        {/* Processing indicator */}
        <motion.div
          className="flex items-center gap-[1.5vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 1.2 }}
        >
          <motion.div
            className="w-[1vw] h-[1vw] bg-rose-800 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[1.5vw] font-bold text-slate-600">Đang quét...</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
