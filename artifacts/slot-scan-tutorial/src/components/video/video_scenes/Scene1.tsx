import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      {/* Main heading */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-[8vw] font-extrabold text-slate-900 tracking-tight leading-none">
          Nhận Diện Ô Ảnh
        </h1>
        <p className="text-[3vw] font-bold text-rose-800 mt-[1.5vh] tracking-wide">
          5 BƯỚC ĐƠN GIẢN
        </p>
      </motion.div>

      {/* Step indicators */}
      <motion.div
        className="flex gap-[2vw] mt-[6vh]"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {[1, 2, 3, 4, 5].map((num, i) => (
          <motion.div
            key={num}
            className="flex flex-col items-center gap-[1vh]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 0.4, 
              delay: 0.4 + (i * 0.08),
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
          >
            <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-rose-800 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-[1.8vw]">{num}</span>
            </div>
            <div className="w-[0.3vw] h-[3vh] bg-rose-200 rounded-full" />
          </motion.div>
        ))}
      </motion.div>

      {/* Subtitle */}
      <motion.p
        className="text-[1.8vw] font-semibold text-slate-600 mt-[4vh] text-center max-w-[70vw]"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        Tự động quét và đánh dấu vị trí ảnh trong frame
      </motion.p>
    </motion.div>
  );
}
