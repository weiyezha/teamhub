import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ theme, toggle }: { theme: string; toggle: () => void }) {
  const isDark = theme === 'dark';
  return (
    <motion.button
      onClick={toggle}
      className="fixed bottom-6 right-6 z-[100] w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--champagne)',
        boxShadow: 'var(--shadow-lg)',
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
      </motion.div>
    </motion.button>
  );
}
