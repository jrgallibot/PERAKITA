'use client';

import type { SpendingSlice } from '@perakita/shared';

type SpendingDonutProps = {
  slices: SpendingSlice[];
  trackColor?: string;
};

export function SpendingDonut({ slices, trackColor = 'var(--border)' }: SpendingDonutProps) {
  const size = 140;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const spentPercent = Math.min(100, slices.reduce((sum, slice) => sum + slice.percent, 0));

  return (
    <div className="relative flex items-center justify-center">
      <svg aria-hidden height={size} width={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {slices.map((slice) => {
          const length = (slice.percent / 100) * circumference;
          const circle = (
            <circle
              key={slice.name}
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={radius}
              stroke={slice.color}
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              strokeWidth={stroke}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute text-center">
        <p className="text-xs text-[var(--muted)]">Spent</p>
        <p className="text-xl font-bold">{spentPercent}%</p>
      </div>
    </div>
  );
}
