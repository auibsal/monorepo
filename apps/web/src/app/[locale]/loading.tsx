'use client';

import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f8f8f8]">
      <motion.div
        animate={{ 
          y: [-10, 10, -10],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 3,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* Replace with your actual logo path */}
        <img src="/logo-samoon.png" alt="The Iraqi Curator Loading" className="w-32 h-32 object-contain drop-shadow-xl" />
      </motion.div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-amber-600"
      >
        Curating Experience...
      </motion.p>
    </div>
  );
}
