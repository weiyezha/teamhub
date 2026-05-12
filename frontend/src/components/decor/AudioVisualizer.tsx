import { motion } from 'framer-motion';

export function AudioVisualizer({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-[3px] h-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ backgroundColor: 'var(--champagne)' }}
          animate={{ height: ['20%', '100%', '40%', '80%', '20%'] }}
          transition={{ duration: 1.2 + Math.random() * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}
