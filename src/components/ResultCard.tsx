'use client';

import { TypingAttempt } from '@/types';
import { MAX_TYPING_ATTEMPTS } from '@/lib/storage';

interface Props {
  result: TypingAttempt;
  allResults: TypingAttempt[];
  onNext?: () => void;
  isLast: boolean;
}

export default function ResultCard({ result, allResults, onNext, isLast }: Props) {
  const attemptsLeft = MAX_TYPING_ATTEMPTS - allResults.length;
  const maxWpm = Math.max(...allResults.map(r => r.wpm));

  return (
    <div className="animate-fade-in space-y-6">
      {/* WPM + Accuracy */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <div className="font-mono text-5xl font-light text-accent tabular-nums">{result.wpm}</div>
          <div className="text-sub text-xs uppercase tracking-widest mt-2 font-mono">WPM</div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <div className="font-mono text-5xl font-light text-text tabular-nums">
            {result.accuracy.toFixed(1)}
          </div>
          <div className="text-sub text-xs uppercase tracking-widest mt-2 font-mono">Aniqlik %</div>
        </div>
      </div>

      {/* Qo'shimcha stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Raw WPM" value={result.rawWpm} />
        <Stat label="To'g'ri" value={result.correctWords} />
        <Stat label="Ball" value={parseFloat(result.score.toFixed(1))} />
      </div>

      {/* Barcha urinishlar */}
      {allResults.length > 1 && (
        <div className="space-y-2">
          <p className="text-muted text-xs font-mono uppercase tracking-widest">Barcha urinishlar</p>
          <div className="space-y-1.5">
            {allResults.map((r, i) => {
              const isBest = r.wpm === maxWpm && allResults.findIndex(x => x.wpm === maxWpm) === i;
              const isCurrent = r === result;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-mono
                    ${isCurrent ? 'border-accent/30 bg-accent/5' : 'border-border bg-surface'}`}
                >
                  <span className="text-muted">#{i + 1}</span>
                  <span className="text-text font-semibold">{r.wpm} wpm</span>
                  <span className="text-muted">{r.accuracy.toFixed(1)}%</span>
                  {isBest && <span className="text-accent text-xs">★ best</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tugmalar */}
      {!isLast && onNext && (
        <button
          onClick={onNext}
          className="w-full bg-accent text-bg font-mono font-semibold py-3 rounded-xl
            hover:bg-accent-dim active:scale-[0.98] transition-all duration-150"
        >
          Keyingi urinish ({attemptsLeft} ta qoldi) →
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3 text-center">
      <div className="font-mono text-xl font-light text-text tabular-nums">{value}</div>
      <div className="text-muted text-xs uppercase tracking-widest mt-1 font-mono">{label}</div>
    </div>
  );
}

