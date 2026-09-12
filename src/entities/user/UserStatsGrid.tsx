import type { ComponentType } from 'react';
import { motion } from 'motion/react';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

function RollingStatNumber({ value }: { value: number }) {
  const characters = String(value).split('');

  return (
    <span className="inline-flex align-bottom tracking-normal">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex">
        {characters.map((character, index) => {
          const place = characters.length - index - 1;
          if (!/\d/.test(character)) return <span key={`separator-${place}`}>{character}</span>;

          return (
            <span key={place} className="inline-block h-[1em] w-[1ch] overflow-hidden leading-none">
              <motion.span
                className="block"
                initial={{ y: '0em' }}
                animate={{ y: `-${Number(character)}em` }}
                transition={{ duration: 0.65, delay: place * 0.035, ease: [0.22, 1, 0.36, 1] }}
              >
                {DIGITS.map((digit) => <span key={digit} className="block h-[1em]">{digit}</span>)}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

interface UserStatItem {
  label: string;
  value: number | string;
  icon?: ComponentType<{ className?: string }>;
}

interface UserStatsGridProps {
  items: UserStatItem[];
}

export function UserStatsGrid({ items }: UserStatsGridProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const desktopColumns = items.length === 3 ? 'sm:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <div className={`mx-auto grid max-w-4xl grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-7 lg:gap-x-5 ${desktopColumns}`}>
      {items.map((item) => (
        <div key={item.label} className="py-1 text-center sm:py-2">
          {item.icon && (
            <div className="mb-1.5 flex justify-center text-(--od-accent) sm:mb-3">
              <item.icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
          )}
          <div>
            <p className="text-[0.78rem] font-medium text-(--od-text-secondary) sm:text-sm">{item.label}</p>
            <p className="mt-1 text-[1.55rem] font-bold tracking-[-0.04em] text-(--od-text-value) tabular-nums sm:mt-2 sm:text-[2.5rem]">
              {typeof item.value === 'number' && !prefersReducedMotion
                ? <RollingStatNumber value={item.value} />
                : item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
