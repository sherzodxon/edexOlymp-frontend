'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, saveStoredUser } from '@/lib/storage';
import { api } from '@/lib/api';
import { TestQuestion } from '@/types';
import ExamLayout from '@/components/ExamLayout';
import { AlertTriangle, X } from 'lucide-react';

interface QuestionWithAnswer extends TestQuestion {
  selected: string | null;
}

export default function TestExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);

  // Tab nazorat
  const [tabWarning, setTabWarning] = useState(false);   // 1-chi ogohlantrish modali
  const [tabViolations, setTabViolations] = useState(0); // nechi marta chiqib ketdi

  const rafRef        = useRef<number>(0);
  const submittedRef  = useRef(false);
  const tokenRef      = useRef('');
  const questionsRef  = useRef<QuestionWithAnswer[]>([]);
  const violationsRef = useRef(0); // closure uchun ref

  useEffect(() => { questionsRef.current = questions; }, [questions]);
// Savollarni random chalkashtirish uchun funksiya
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setSubmitting(true);

    const answers = questionsRef.current
      .filter(q => q.selected)
      .map(q => ({ questionId: q.id, selectedOption: q.selected! }));

    try {
      const res = await api.submitTest({ token: tokenRef.current, answers }) as { score: number };
      const user = getStoredUser();
      if (user) saveStoredUser({ ...user, testDone: true, testScore: res.score });
      setScore(res.score);
      setDone(true);
    } catch (err) {
      console.error('Submit test error:', err);
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, []);

  // ── rAF ticker ────────────────────────────────────────────
  const startTicker = useCallback((deadlineMs: number) => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) { handleSubmit(true); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [handleSubmit]);

  // ── Tab visibility nazorat ────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Tab yashirildi (boshqa tabga o'tdi yoki minimize)
      if (document.hidden) {
        violationsRef.current += 1;
        setTabViolations(violationsRef.current);

        if (violationsRef.current === 1) {
          // 1-marta: ogohlantirish
          setTabWarning(true);
        } else if (violationsRef.current >= 2) {
          // 2-marta: avtomatik yakunlash
          setTabWarning(false);
          handleSubmit(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleSubmit]);

  // ── initTest ──────────────────────────────────────────────
  useEffect(() => {
    const user = getStoredUser();
    if (!user)            { router.replace('/register');    return; }
    if (user.testDone)    { router.replace('/exam/docs');   return; }
    if (!user.typingDone) { router.replace('/exam/typing'); return; }

    tokenRef.current = user.userInfo.token;
    initTest(user.userInfo.token);

    return () => { cancelAnimationFrame(rafRef.current); };
  }, [router]);

  const initTest = async (token: string) => {
    try {
      type SessionData = {
        questions?: TestQuestion[];
        existingAnswers?: { questionId: number; selectedOption: string }[];
        timeLimitSec?: number;
        remainingSec?: number;
        completed?: boolean;
        score?: number;
      };

      let sessionData: SessionData;
      try {
        sessionData = await api.startTest(token) as SessionData;
      } catch {
        sessionData = await api.getTestQuestions(token) as SessionData;
      }

      if (sessionData.completed) {
        setScore(sessionData.score ?? 0);
        setDone(true);
        setLoading(false);
        return;
      }

      const rawQuestions = sessionData.questions ?? [];
      if (rawQuestions.length === 0) {
        const fallback = await api.getTestQuestions(token) as SessionData;
        if (fallback.completed) {
          setScore(fallback.score ?? 0);
          setDone(true);
          setLoading(false);
          return;
        }
        return initFromData(fallback);
      }
      initFromData(sessionData);
    } catch (err) {
      console.error('Init test error:', err);
      setLoading(false);
    }
  };

  const initFromData = (sessionData: {
    questions?: TestQuestion[];
    existingAnswers?: { questionId: number; selectedOption: string }[];
    timeLimitSec?: number;
    remainingSec?: number;
  }) => {
    const rawQuestions = sessionData.questions ?? [];
    const existingAnswers = sessionData.existingAnswers ?? [];
    const answerMap = new Map(existingAnswers.map(a => [a.questionId, a.selectedOption]));

    // 1. Dastlab savollarga tanlangan javoblarni biriktiramiz
    let qs: QuestionWithAnswer[] = rawQuestions.map((q: TestQuestion) => ({
      ...q,
      selected: answerMap.get(q.id) ?? null,
    }));

    // 2. AGAR oldin javob berilmagan bo'lsa (yangi test bo'lsa), savollarni chalkashtiramiz
    // Agar foydalanuvchi sahifani refresh qilsa, tartib buzilmasligi uchun 
    // existingAnswers bo'sh bo'lgandagina shuffle qilish tavsiya etiladi.
    // Agar har doim random bo'lishini xohlasangiz, shunchaki: qs = shuffleArray(qs);
    if (existingAnswers.length === 0) {
      qs = shuffleArray(qs);
    }

    setQuestions(qs);
    questionsRef.current = qs;

    const remaining = sessionData.remainingSec ?? sessionData.timeLimitSec ?? 1200;
    const total = sessionData.timeLimitSec ?? 1200;

    setTotalTime(total);
    setTimeLeft(remaining);
    setLoading(false);

    const deadline = Date.now() + remaining * 1000;
    startTicker(deadline);
  };

  const selectAnswer = (option: string) => {
    setQuestions(qs => qs.map((q, i) => (i === currentIdx ? { ...q, selected: option } : q)));
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress  = questions.filter(q => q.selected).length;
  const pct       = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const isUrgent  = timeLeft > 0 && timeLeft < 120;

  if (loading) return <FullSpinner />;

  if (done) {
    return (
      <ExamLayout phase="test">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="animate-scale-in bg-surface border border-accent/30 rounded-2xl p-8 text-center w-full max-w-sm space-y-5">
            <div className="text-4xl">✅</div>
            <div>
              <p className="text-sub text-sm font-mono mb-1">Test natijasi</p>
              <p className="text-5xl font-mono font-bold text-accent">{score}</p>
              <p className="text-sub text-sm mt-1">to'g'ri javob / 20</p>
            </div>
            <div className="bg-bg rounded-xl p-4 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-sub">Test bali</span>
                <span className="font-mono text-accent font-semibold">{score} / 20</span>
              </div>
            </div>
            <p className="text-sub text-sm">Test bosqichi yakunlandi ✓</p>
            <button
              onClick={() => router.push('/exam/docs')}
              className="w-full bg-accent text-bg font-mono font-semibold py-3 rounded-xl hover:bg-accent-dim transition-all"
            >
              Word bosqichiga o'tish →
            </button>
          </div>
        </div>
      </ExamLayout>
    );
  }

  const q = questions[currentIdx];

  return (
    <ExamLayout phase="test">

      {/* ── 1-chi ogohlantrish modali ── */}
      {tabWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4">
          <div className="animate-scale-in bg-surface border border-error/40 rounded-2xl p-7 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-error" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Ogohlantirish!</h3>
                <p className="text-sub text-sm mt-1 leading-relaxed">
                  Siz test sahifasini tark etdingiz. Bu <span className="text-error font-medium">qoidabuzarlik</span> hisoblanadi.
                </p>
              </div>
            </div>

            <div className="bg-error/5 border border-error/20 rounded-xl px-4 py-3">
              <p className="text-error text-sm font-mono font-medium">
                ⚠ Keyingi marta sahifani tark etsangiz, test avtomatik yakunlanadi!
              </p>
            </div>

            {/* Violations indicator */}
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs font-mono">Qoidabuzarlik:</span>
              <div className="flex gap-1.5">
                {[1, 2].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all
                    ${i <= tabViolations ? 'bg-error border-error' : 'border-border'}`} />
                ))}
              </div>
              <span className="text-muted text-xs font-mono">{tabViolations}/2</span>
            </div>

            <button
              onClick={() => setTabWarning(false)}
              className="w-full bg-accent text-bg font-mono font-semibold py-3 rounded-xl
                hover:bg-accent-dim transition-all"
            >
              Tushundim, testni davom ettiraman
            </button>
          </div>
        </div>
      )}

      {/* ── Timer bar ── */}
      <div className="border-b border-border px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className={`font-mono text-xl font-bold tabular-nums min-w-[60px]
            ${isUrgent ? 'text-error animate-pulse' : 'text-text'}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isUrgent ? 'bg-error' : 'bg-accent'}`}
              style={{ width: `${pct}%`, transition: 'width 0.9s linear' }}
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Violations badge */}
            {tabViolations > 0 && (
              <div className="flex items-center gap-1.5 bg-error/10 border border-error/20 rounded-full px-2.5 py-1">
                <AlertTriangle size={10} className="text-error" />
                <span className="text-error text-xs font-mono font-medium">{tabViolations}/2</span>
              </div>
            )}
            <span className="text-sub text-sm font-mono whitespace-nowrap">
              {progress} / {questions.length} javoblandi
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-0 max-w-5xl mx-auto w-full px-4 py-6">
        {/* ── Sidebar ── */}
        <div className="w-48 shrink-0 mr-6 hidden lg:block">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Savollar</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-7 h-7 rounded-lg text-xs font-mono transition-all
                  ${i === currentIdx
                    ? 'bg-accent text-bg'
                    : q.selected
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface border border-border text-muted hover:border-muted'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main question ── */}
        <div className="flex-1 animate-fade-in" key={currentIdx}>
          <div className="bg-surface border border-border rounded-2xl p-6 lg:p-8 space-y-6">
            <div className="flex items-start gap-3">
              <span className="text-accent font-mono text-sm font-bold mt-0.5 shrink-0">
                {currentIdx + 1}.
              </span>
              <p className="text-text text-base leading-relaxed">{q?.questionText}</p>
            </div>

            {/* Savol rasmi — faqat imageUrl mavjud bo'lsa ko'rsatiladi */}
            {q?.imageUrl && (
              <div className="flex justify-center">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${q.imageUrl}`}
                  alt={`${currentIdx + 1}-savol rasmi`}
                  className="max-h-64 max-w-full rounded-xl border border-border object-contain bg-bg"
                  loading="lazy"
                />
              </div>
            )}

            <div className="space-y-2.5">
              {['A', 'B', 'C', 'D'].map(opt => {
                const text       = q?.[`option${opt}` as keyof TestQuestion] as string;
                const isSelected = q?.selected === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(opt)}
                    className={`answer-option w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all
                      ${isSelected ? 'selected' : 'border-border'}`}
                  >
                    <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-mono font-bold shrink-0
                      ${isSelected ? 'border-accent bg-accent text-bg' : 'border-border text-muted'}`}>
                      {opt}
                    </span>
                    <span className="text-sm text-text">{text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="px-5 py-2.5 rounded-xl border border-border text-sub text-sm font-mono
                hover:border-muted transition-all disabled:opacity-30"
            >
              ← Oldingi
            </button>
            <span className="text-muted text-xs font-mono">
              {currentIdx + 1} / {questions.length}
            </span>
            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                className="px-5 py-2.5 rounded-xl border border-border text-sub text-sm font-mono
                  hover:border-muted transition-all"
              >
                Keyingi →
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-accent text-bg text-sm font-mono font-semibold
                  hover:bg-accent-dim transition-all disabled:opacity-50"
              >
                {submitting ? 'Yuborilmoqda...' : 'Yakunlash ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}

function FullSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sub text-sm font-mono">Test yuklanmoqda...</p>
      </div>
    </div>
  );
}