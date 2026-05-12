import { useState, useEffect } from 'react';

export function CountUp({ value, index = 0 }: { value: number; index?: number }) {
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    const duration = 1200;
    const delay = 600 + index * 120;
    const startTime = Date.now();

    const timeout = setTimeout(() => {
      const animate = () => {
        const elapsed = Date.now() - startTime - delay;
        if (elapsed < 0) { requestAnimationFrame(animate); return; }
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(value * eased);
        setDisplayValue(current.toLocaleString());
        if (progress < 1) requestAnimationFrame(animate);
        else setDisplayValue(value.toLocaleString());
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, index]);

  return <span>{displayValue}</span>;
}
