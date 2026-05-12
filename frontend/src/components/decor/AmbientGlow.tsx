import { motion } from 'framer-motion';

export function AmbientGlow() {
  const orbs = [
    { cx: '25%', cy: '35%', r: '35%', color: 'var(--glow-orb-1)', duration: 12 },
    { cx: '75%', cy: '25%', r: '30%', color: 'var(--glow-orb-2)', duration: 15 },
    { cx: '50%', cy: '70%', r: '40%', color: 'var(--glow-orb-3)', duration: 18 },
    { cx: '15%', cy: '75%', r: '25%', color: 'var(--glow-orb-4)', duration: 14 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.r, height: orb.r, left: orb.cx, top: orb.cy,
            background: orb.color, filter: 'blur(var(--orb-blur))',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ x: ['-10%', '10%', '-10%'], y: ['-8%', '12%', '-8%'], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
