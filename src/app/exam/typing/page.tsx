'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, addTypingAttempt, getBestTyping, MAX_TYPING_ATTEMPTS, MAX_TYPING_SCORE, calcTypingScore, saveStoredUser } from '@/lib/storage';
import { api } from '@/lib/api';
import { TypingAttempt, StoredUser } from '@/types';
import ExamLayout from '@/components/ExamLayout';
import TypingArea, { TypingResult } from '@/components/TypingArea';
import PhaseTimer from '@/components/PhaseTimer';
import { TYPING_PHASE_DURATION } from '@/lib/words';

type Phase = 'typing' | 'result' | 'done';

const PHASE_DEADLINE_KEY = 'edex_typing_phase_deadline';

export default function TypingExamPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [phase, setPhase] = useState<Phase>('typing');
  const [lastResult, setLastResult] = useState<TypingAttempt | null>(null);
  const [attemptKey, setAttemptKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/register'); return; }
    if (stored.typingDone) { router.replace('/exam/test'); return; }
    setUser(stored);
  }, [router]);

  const attemptsUsed = user?.typingAttempts.length ?? 0;
  const best = useMemo(() => (user ? getBestTyping(user.typingAttempts) : null), [user]);

  // ── Bir urinishni saqlash ──
  // Stable bo'lishi uchun isSaving ni ref orqali ushlaymiz —
  // shunda parent har render uchun handleComplete reference o'zgarmaydi.
  const isSavingRef = useRef(isSaving);
  useEffect(() => { isSavingRef.current = isSaving; }, [isSaving]);

  const handleComplete = useCallback(
    async (result: TypingAttempt) => {
      if (isSavingRef.current) return;
      const stored = getStoredUser();
      if (!stored || stored.typingAttempts.length >= MAX_TYPING_ATTEMPTS) return;

      setIsSaving(true);

      const updated = addTypingAttempt(result);
      if (!updated) { setIsSaving(false); return; }
      setUser({ ...updated });
      setLastResult(result);

      const newAttempts = updated.typingAttempts;
      const allDone = newAttempts.length >= MAX_TYPING_ATTEMPTS;

      api.submitTypingAttempt({
        token: stored.userInfo.token,
        wpm: result.wpm,
        rawWpm: result.rawWpm,
        accuracy: result.accuracy,
        correctWords: result.correctWords,
        totalWords: result.totalWords,
      }).catch((err: unknown) => console.error('Submit attempt error:', err));

      if (allDone) {
        const bestWpm = Math.max(...newAttempts.map((a) => a.wpm));
        const bestScore = calcTypingScore(bestWpm);
        const finalUser: StoredUser = {
          ...updated,
          typingDone: true,
          typingScore: bestScore,
        };
        saveStoredUser(finalUser);
        setUser(finalUser);
        setPhase('done');
        try { localStorage.removeItem(PHASE_DEADLINE_KEY); } catch {}
        return;
      }

      setPhase('result');
    },
    [] // STABLE — eslab qoling, isSaving ni ref orqali o'qiymiz
  );

  // TypingArea uchun stable callback prop —
  // har render uchun yangi reference yaratmaydi.
  const handleTypingResult = useCallback((r: TypingResult) => {
    handleComplete({
      ...r,
      score: calcTypingScore(r.wpm),
      timestamp: Date.now(),
      attemptNumber: 0,  // backend hisoblamaydi, faqat saqlash uchun
    });
  }, [handleComplete]);

  // ── Faza vaqti tugaganda — eng yaxshi natijani saqlab, fazani tugatish ──
  const handlePhaseExpire = useCallback(() => {
    const stored = getStoredUser();
    if (!stored) return;

    const attempts = stored.typingAttempts;
    const bestWpm = attempts.length ? Math.max(...attempts.map(a => a.wpm)) : 0;
    const bestScore = calcTypingScore(bestWpm);

    const finalUser: StoredUser = {
      ...stored,
      typingDone: true,
      typingScore: bestScore,
    };
    saveStoredUser(finalUser);
    setUser(finalUser);
    setPhase('done');
    try { localStorage.removeItem(PHASE_DEADLINE_KEY); } catch {}

    if (attempts.length > 0) {
      const last = attempts[attempts.length - 1];
      api.submitTypingAttempt({
        token: stored.userInfo.token,
        wpm: last.wpm,
        rawWpm: last.rawWpm,
        accuracy: last.accuracy,
        correctWords: last.correctWords,
        totalWords: last.totalWords,
      }).catch(() => {});
    }
  }, []);

  const handleNextAttempt = () => {
    setIsSaving(false);
    setPhase('typing');
    setLastResult(null);
    setAttemptKey((k) => k + 1);
  };

  const handleFinish = () => {
    router.push('/exam/test');
  };

  if (!user) return <Spinner />;

  return (
    <ExamLayout phase="typing">
      {/* ── Umumiy 5 daqiqa typing fazasi taymeri (mustaqil komponent — parentni re-render qilmaydi) ── */}
      <PhaseTimer
        durationSec={TYPING_PHASE_DURATION}
        storageKey={PHASE_DEADLINE_KEY}
        label="umumiy typing vaqti"
        onExpire={handlePhaseExpire}
        active={phase !== 'done'}
      />

      <div className="flex-1 flex flex-col items-center  px-4 py-8">
        {/* Attempt indicators */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: MAX_TYPING_ATTEMPTS }).map((_, i) => {
            const attempt = user.typingAttempts[i];
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono
                  ${attempt
                    ? 'border-accent/40 bg-accent/5 text-accent'
                    : i === attemptsUsed && phase === 'typing'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted'}`}
                >
                  <span>{i + 1}-urinish</span>
                  {attempt && <span className="text-accent font-semibold">{attempt.wpm} WPM</span>}
                </div>
                {i < MAX_TYPING_ATTEMPTS - 1 && (
                  <div className={`w-6 h-px ${i < attemptsUsed ? 'bg-accent' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Typing area */}
        {phase === 'typing' && (
          <div className="w-full max-w-7xl animate-fade-in">
            <TypingArea
              attemptNumber={attemptKey}
              onComplete={handleTypingResult}
            />
          </div>
        )}

        {/* Result after attempt */}
        {phase === 'result' && lastResult && (
          <div className="animate-scale-in w-full max-w-sm">
            <AttemptResult
              result={lastResult}
              attemptNumber={user.typingAttempts.length}
              attemptsLeft={MAX_TYPING_ATTEMPTS - user.typingAttempts.length}
              best={best}
              onNext={handleNextAttempt}
            />
          </div>
        )}

        {/* All done */}
        {phase === 'done' && (
          <div className="animate-scale-in w-full max-w-sm">
            <div className="bg-surface border border-accent/30 rounded-2xl p-8 text-center space-y-5">
              <div className="text-4xl">{best ? '🎉' : '⏱'}</div>
              <div>
                <p className="text-sub text-sm font-mono mb-1">
                  {best ? 'Eng yaxshi natija' : 'Vaqt tugadi'}
                </p>
                <p className="text-5xl font-mono font-bold text-accent">{best?.wpm ?? 0}</p>
                <p className="text-sub text-sm mt-1">WPM</p>
              </div>
              <div className="bg-bg rounded-xl p-4 border border-border space-y-2">
                <ScoreLine label="Typing bali" value={`${calcTypingScore(best?.wpm ?? 0).toFixed(1)} / ${MAX_TYPING_SCORE}`} />
                <ScoreLine label="Aniqlik" value={`${(best?.accuracy ?? 0).toFixed(1)}%`} />
                <p className="text-muted text-[10px] text-center mt-1">1 WPM = 0.5 ball · 50+ WPM = max 25 ball</p>
              </div>
              <p className="text-sub text-sm">Typing bosqichi yakunlandi ✓</p>
              <button
                onClick={handleFinish}
                className="w-full bg-accent text-bg font-mono font-semibold py-3 rounded-xl
                  hover:bg-accent-dim transition-all"
              >
                Test bosqichiga o'tish →
              </button>
            </div>
          </div>
        )}
      </div>
    </ExamLayout>
  );
}

function AttemptResult({
  result, attemptNumber, attemptsLeft, best, onNext,
}: {
  result: TypingAttempt;
  attemptNumber: number;
  attemptsLeft: number;
  best: TypingAttempt | null;
  onNext: () => void;
}) {
  const isBest = !best || result.wpm >= best.wpm;

  return (
    <div className="bg-surface border border-border rounded-2xl p-7 space-y-5 text-center">
      <div>
        <p className="text-sub text-xs font-mono uppercase tracking-widest mb-2">
          {attemptNumber}-urinish natijasi
          {isBest && <span className="ml-2 text-accent">★ Eng yaxshi</span>}
        </p>
        <p className="text-6xl font-mono font-bold text-text">{result.wpm}</p>
        <p className="text-sub text-sm mt-1">WPM</p>
      </div>

      <div className="bg-bg rounded-xl p-4 border border-border space-y-2 text-sm">
        <ScoreLine label="Ball" value={`${result.score}`} accent />
        <ScoreLine label="Aniqlik" value={`${result.accuracy.toFixed(1)}%`} />
        <ScoreLine label="To'g'ri so'zlar" value={`${result.correctWords}`} />
      </div>

      {attemptsLeft > 0 ? (
        <div className="space-y-3">
          <p className="text-sub text-sm">{attemptsLeft} ta urinish qoldi</p>
          <button
            onClick={onNext}
            className="w-full bg-accent text-bg font-mono font-semibold py-3 rounded-xl
              hover:bg-accent-dim transition-all"
          >
            Qayta urinish →
          </button>
        </div>
      ) : (
        <p className="text-sub text-sm animate-pulse">Natijalar qayta ishlanmoqda...</p>
      )}
    </div>
  );
}

function ScoreLine({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-sub">{label}</span>
      <span className={`font-mono font-medium ${accent ? 'text-accent' : 'text-text'}`}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
