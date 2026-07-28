import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, y: '10vh' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center gap-[4vh]">
        {/* Step indicator */}
        <motion.div
          className="flex items-center gap-[2vw]"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-[4.5vw] h-[4.5vw] rounded-full bg-rose-800 flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-[2.2vw]">4</span>
          </div>
          <div className="text-left">
            <p className="text-[2.8vw] font-bold text-slate-900">Kiểm Tra Ô Ảnh</p>
            <p className="text-[1.5vw] text-slate-600 font-semibold">Xem các vị trí đã nhận diện</p>
          </div>
        </motion.div>

        {/* Canvas preview with detected slots */}
        <motion.div
          className="relative w-[50vw] h-[35vh] bg-white rounded-lg shadow-2xl border-2 border-slate-200 overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Background frame illustration */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 opacity-50" />
          
          {/* Detected slot rectangles */}
          {[
            { x: '15%', y: '20%', w: '25%', h: '30%', delay: 0 },
            { x: '55%', y: '20%', w: '25%', h: '30%', delay: 0.15 },
            { x: '35%', y: '60%', w: '25%', h: '30%', delay: 0.3 },
          ].map((slot, i) => (
            <motion.div
              key={i}
              className="absolute border-4 border-rose-800 bg-rose-800/10 rounded"
              style={{ 
                left: slot.x, 
                top: slot.y, 
                width: slot.w, 
                height: slot.h 
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              transition={{ 
                duration: 0.5, 
                delay: slot.delay,
                type: 'spring',
                stiffness: 300,
                damping: 20
              }}
            >
              {/* Corner handles */}
              <div className="absolute -top-[0.4vw] -left-[0.4vw] w-[0.8vw] h-[0.8vw] bg-white border-2 border-rose-800 rounded-full" />
              <div className="absolute -top-[0.4vw] -right-[0.4vw] w-[0.8vw] h-[0.8vw] bg-white border-2 border-rose-800 rounded-full" />
              <div className="absolute -bottom-[0.4vw] -left-[0.4vw] w-[0.8vw] h-[0.8vw] bg-white border-2 border-rose-800 rounded-full" />
              <div className="absolute -bottom-[0.4vw] -right-[0.4vw] w-[0.8vw] h-[0.8vw] bg-white border-2 border-rose-800 rounded-full" />
            </motion.div>
          ))}
        </motion.div>

        {/* Success indicator */}
        <motion.div
          className="flex items-center gap-[1.5vw] px-[3vw] py-[1.5vh] bg-green-100 rounded-full border-2 border-green-500"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <span className="text-[2vw]">✓</span>
          <span className="text-[1.5vw] font-bold text-green-700">Phát hiện 3 ô ảnh</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
