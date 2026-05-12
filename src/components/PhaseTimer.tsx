'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  durationSec: number;       // umumiy faza vaqti
  storageKey: string;        // localStorage da deadlineni saqlash uchun kalit
  label?: string;            // o'ng tomondagi label (default: "umumiy vaqt")
  onExpire: () => void;      // vaqt tugaganda chaqiriladi
  active: boolean;           // faqat true bo'lsa taymer ishlaydi
}

/**
 * Bu komponent o'zining ichki state'i bilan ishlaydi va parent ga
 * onExpire dan boshqa hech narsa yuklamaydi. Shu sabab parent
 * komponent har soniyada re-render qilmaydi.
 */
export default function PhaseTimer({ durationSec, storageKey, label, onExpire, active }: Props) {
  const [timeLeft, setTimeLeft] = useState(durationSec);

  const rafRef        = useRef<number>(0);
  const expiredRef    = useRef(false);
  const onExpireRef   = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!active) return;

    let deadline: number;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > Date.now()) {
          deadline = parsed;
        } else {
          deadline = Date.now() + durationSec * 1000;
          localStorage.setItem(storageKey, String(deadline));
        }
      } else {
        deadline = Date.now() + durationSec * 1000;
        localStorage.setItem(storageKey, String(deadline));
      }
    } catch {
      deadline = Date.now() + durationSec * 1000;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(rafRef.current); };
  }, [active, durationSec, storageKey]);

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const pct = (timeLeft / durationSec) * 100;
  const urgent = timeLeft <= 60;

  return (
    <div className="border-b border-border px-6 py-3">
      <div className="max-w-3xl mx-auto flex items-center gap-4">
        <Clock size={14} className={urgent ? 'text-error' : 'text-sub'} />
        <div className={`font-mono text-lg font-bold tabular-nums min-w-[60px]
          ${urgent ? 'text-error animate-pulse' : 'text-text'}`}>
          {fmt(timeLeft)}
        </div>
        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${urgent ? 'bg-error' : 'bg-accent'}`}
            style={{ width: `${pct}%`, transition: 'width 0.9s linear' }}
          />
        </div>
        <span className="text-muted text-xs font-mono whitespace-nowrap">
          {label ?? 'umumiy vaqt'}
        </span>
      </div>
    </div>
  );
}
