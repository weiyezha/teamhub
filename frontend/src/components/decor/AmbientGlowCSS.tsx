/** Pure CSS ambient glow orbs - zero JS animation, no Framer Motion */
export function AmbientGlowCSS() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute rounded-full" style={{
        width: '35%', height: '35%', left: '25%', top: '35%',
        background: 'var(--glow-orb-1)', filter: 'blur(var(--orb-blur))',
        animation: 'orbFloat1 12s ease-in-out infinite',
      }} />
      <div className="absolute rounded-full" style={{
        width: '30%', height: '30%', left: '75%', top: '25%',
        background: 'var(--glow-orb-2)', filter: 'blur(var(--orb-blur))',
        animation: 'orbFloat2 15s ease-in-out infinite',
      }} />
      <div className="absolute rounded-full" style={{
        width: '40%', height: '40%', left: '50%', top: '70%',
        background: 'var(--glow-orb-3)', filter: 'blur(var(--orb-blur))',
        animation: 'orbFloat3 18s ease-in-out infinite',
      }} />
      <div className="absolute rounded-full" style={{
        width: '25%', height: '25%', left: '15%', top: '75%',
        background: 'var(--glow-orb-4)', filter: 'blur(var(--orb-blur))',
        animation: 'orbFloat4 14s ease-in-out infinite',
      }} />
    </div>
  );
}
