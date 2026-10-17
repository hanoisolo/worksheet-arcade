import { useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../utils/motion';

const COLORS = ['#f472b6', '#22d3ee', '#a3e635', '#fbbf24', '#f8fafc'];

export default function Confetti({ count = 80 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.6,
      size: 6 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 30,
      color: COLORS[i % COLORS.length],
      round: i % 3 === 0,
    })),
  );
  const [reduced] = useState(prefersReducedMotion);

  if (reduced) return null;

  return (
    <div
      data-testid="confetti"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: p.left + '%',
              width: p.size,
              height: p.size * 0.6,
              background: p.color,
              borderRadius: p.round ? '9999px' : '2px',
              animationDelay: p.delay + 's',
              animationDuration: p.duration + 's',
              ['--drift' as string]: p.drift + 'vw',
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
