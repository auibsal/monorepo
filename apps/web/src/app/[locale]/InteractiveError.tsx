'use client';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { buttonVariants } from '@auibsal/ui';

export default function InteractiveError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Error');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.error(error); // Log to monitoring in production
  }, [error]);

  return (
    <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden bg-zinc-950 p-8 text-zinc-100 selection:bg-white selection:text-black">
      
      {/* Glitching Background Elements */}
      {isClient && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white"
              style={{ height: Math.random() * 4 + 'px', width: Math.random() * 100 + '%' }}
              initial={{ top: Math.random() * 100 + '%', left: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                x: [0, Math.random() * 200 - 100] 
              }}
              transition={{
                duration: Math.random() * 2 + 0.5,
                repeat: Infinity,
                repeatType: "mirror"
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 max-w-2xl border-l-4 border-white pl-8 rtl:border-l-0 rtl:border-r-4 rtl:pl-0 rtl:pr-8">
        <motion.span 
          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} 
          className="absolute -left-20 top-0 rotate-90 font-mono text-xs tracking-[0.4em] rtl:-right-20 rtl:-rotate-90"
        >
          SYS.ERR.{error.digest || '500'}
        </motion.span>
        
        <motion.h1 
          animate={{ x: [-2, 2, -2, 0] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
          className="mb-6 font-serif text-5xl font-black uppercase md:text-7xl"
        >
          {t('title')}
        </motion.h1>
        
        <p className="mb-12 max-w-md text-lg font-light leading-relaxed opacity-80">
          {t('description')}
        </p>

        <motion.button 
          onClick={() => reset()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={buttonVariants({ variant: 'destructive', size: 'lg' })}
        >
          {t('reconstruct')}
        </motion.button>
      </div>
    </div>
  );
}
