import { Music, Mic2, Radio, Headphones, Guitar } from 'lucide-react';

/** Pure CSS floating notes - zero JS animation, no Framer Motion */
export function FloatingNotesCSS() {
  const notes = [
    { icon: Music, x: '12%', y: '85%', size: 18, anim: 'noteFloat1', dur: '18s', delay: '0s' },
    { icon: Mic2, x: '78%', y: '90%', size: 16, anim: 'noteFloat2', dur: '22s', delay: '3s' },
    { icon: Radio, x: '88%', y: '30%', size: 20, anim: 'noteFloat3', dur: '20s', delay: '1s' },
    { icon: Headphones, x: '5%', y: '40%', size: 22, anim: 'noteFloat4', dur: '25s', delay: '5s' },
    { icon: Guitar, x: '65%', y: '80%', size: 14, anim: 'noteFloat5', dur: '19s', delay: '2s' },
    { icon: Music, x: '35%', y: '88%', size: 16, anim: 'noteFloat6', dur: '21s', delay: '4s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {notes.map((n, i) => (
        <div key={i} className="absolute" style={{
          left: n.x, bottom: n.y,
          animation: `${n.anim} ${n.dur} linear infinite`,
          animationDelay: n.delay,
        }}>
          <n.icon size={n.size} strokeWidth={1.5} style={{ color: 'var(--note-color)' }} />
        </div>
      ))}
    </div>
  );
}
