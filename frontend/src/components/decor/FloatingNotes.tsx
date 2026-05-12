import { motion } from 'framer-motion';
import { Music, Mic2, Radio, Headphones, Guitar } from 'lucide-react';

export function FloatingNotes() {
  const notes = [
    { icon: Music, x: '12%', y: '85%', size: 18, duration: 18, delay: 0 },
    { icon: Mic2, x: '78%', y: '90%', size: 16, duration: 22, delay: 3 },
    { icon: Radio, x: '88%', y: '30%', size: 20, duration: 20, delay: 1 },
    { icon: Headphones, x: '5%', y: '40%', size: 22, duration: 25, delay: 5 },
    { icon: Guitar, x: '65%', y: '80%', size: 14, duration: 19, delay: 2 },
    { icon: Music, x: '35%', y: '88%', size: 16, duration: 21, delay: 4 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {notes.map((note, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: note.x, bottom: note.y }}
          animate={{
            y: [0, -600, -1200],
            x: [0, (i % 2 === 0 ? 1 : -1) * 40, 0],
            opacity: [0, 'var(--note-opacity)', 0],
            rotate: [0, (i % 2 === 0 ? 1 : -1) * 15, 0],
          }}
          transition={{ duration: note.duration, delay: note.delay, repeat: Infinity, ease: 'linear' }}
        >
          <note.icon size={note.size} strokeWidth={1.5} style={{ color: 'var(--note-color)' }} />
        </motion.div>
      ))}
    </div>
  );
}
