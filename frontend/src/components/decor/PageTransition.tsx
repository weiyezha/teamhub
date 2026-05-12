import { motion, type Variants } from 'framer-motion';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-6"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}
