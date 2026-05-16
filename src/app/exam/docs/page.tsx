'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, saveStoredUser } from '@/lib/storage';
import { api } from '@/lib/api';
import ExamLayout from '@/components/ExamLayout';
import { FileText, Upload, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

type Phase = 'upload' | 'uploading' | 'done' | 'expired';

interface FeedbackItem {
  item: string;
  passed: boolean;
  points: number;
  hint?: string;
}

export default function DocsExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [criteria, setCriteria] = useState<{ nomi?: string; label?: string; maksimal_ball?: number }[] | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  // Date-based aniq timer
  const deadlineRef  = useRef<number>(0);
  const rafRef       = useRef<number>(0);
  const expiredRef   = useRef(false);
  const inputRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user)            { router.replace('/register');  return; }
    if (user.docsDone)    { router.replace('/exam/pptx'); return; }
    if (!user.testDone)   { router.replace('/exam/test'); return; }

    setToken(user.userInfo.token);
    loadStatus(user.userInfo.token);

    return () => { cancelAnimationFrame(rafRef.current); };
  }, [router]);

  // rAF ticker — har frame da haqiqiy qolgan soniyani hisoblaydi
  const startTicker = useCallback((deadlineMs: number) => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          setPhase('expired');
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const loadStatus = async (tok: string) => {
    try {
      const res = await api.getDocsStatus(tok) as {
        data: {
          status: string;
          submission: { score: number; feedback: string } | null;
          timeLimitSec: number;
          criteria: { items: { label: string }[] } | null;
        };
      };
      const { data } = res;

      if (data.submission) {
        setScore(data.submission.score);
        try { setFeedback(JSON.parse(data.submission.feedback ?? '[]')); }
        catch { setFeedback([]); }
        setPhase('done');
        return;
      }

      const total     = data.timeLimitSec ?? 1800;
      // Backend remainingSec qaytarsa — ishon (refresh holatida to'g'ri qolgan vaqt)
      // Aks holda to'liq limitdan boshla
      const remaining = (data as { remainingSec?: number }).remainingSec ?? total;

      setTotalTime(total);
      setTimeLeft(remaining);
      // criteria yangi format: { baholash_mezonlari: [...] } yoki eski { items: [...] }
      const crit = data.criteria as { baholash_mezonlari?: { nomi: string; maksimal_ball: number }[]; items?: { label: string }[] } | null;
      setCriteria(crit?.baholash_mezonlari ?? crit?.items ?? null);

      const deadline = Date.now() + remaining * 1000;
      deadlineRef.current = deadline;
      startTicker(deadline);

    } catch (err) {
      console.error('Load docs status error:', err);
    }
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setError('');
    setPhase('uploading');

    try {
      const res = await api.uploadDoc(token, file) as {
        data: { score: number; feedback: FeedbackItem[]; fileName: string };
      };
      // Timerni to'xtatish
      cancelAnimationFrame(rafRef.current);

      const user = getStoredUser();
      if (user) saveStoredUser({ ...user, docsDone: true, docsScore: res.data.score });

      setScore(res.data.score);
      setFeedback(res.data.feedback);
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fayl yuklanmadi. Qayta urinib ko\'ring.');
      setPhase('upload');
    }
  };

  const validateFile = (f: File): string | null => {
    if (!f.name.endsWith('.docx')) return 'Faqat .docx formatdagi fayllar qabul qilinadi';
    if (f.size === 0)              return "Fayl bo'sh (0 KB). To'g'ri fayl yuklang";
    if (f.size > 10 * 1024 * 1024) return 'Fayl hajmi 10 MB dan oshmasligi kerak';
    return null;
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    const err = validateFile(dropped);
    if (err) { setError(err); return; }
    setFile(dropped);
    setError('');
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const pct      = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const isUrgent = timeLeft > 0 && timeLeft < 300; // 5 daqiqa

  return (
    <ExamLayout phase="docs">
      {/* Timer bar */}
      {phase !== 'done' && phase !== 'expired' && (
        <div className="border-b border-border px-6 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <Clock size={14} className={isUrgent ? 'text-error' : 'text-sub'} />
            <div className={`font-mono text-lg font-bold tabular-nums min-w-[60px]
              ${isUrgent ? 'text-error animate-pulse' : 'text-text'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isUrgent ? 'bg-error' : 'bg-accent'}`}
                style={{ width: `${pct}%`, transition: 'width 0.9s linear' }}
              />
            </div>
            <span className="text-muted text-xs font-mono">qoldi</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4 py-8">

        {/* ─── EXPIRED ─── */}
        {phase === 'expired' && (
          <div className="animate-scale-in text-center max-w-sm space-y-4">
            <AlertTriangle size={48} className="text-error mx-auto" />
            <h2 className="text-xl font-semibold text-text">Vaqt tugadi</h2>
            <p className="text-sub text-sm">Afsuski, fayl yuklash vaqti tugadi.</p>
            <button
              onClick={() => router.push('/exam/pptx')}
              className="w-full bg-surface border border-border text-text font-mono py-3 rounded-xl hover:border-muted transition-all"
            >
              PowerPoint bosqichiga o'tish →
            </button>
          </div>
        )}

        {/* ─── UPLOAD ─── */}
        {(phase === 'upload' || phase === 'uploading') && (
          <div className="w-full max-w-lg space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-text mb-1">Word fayl yuklash</h2>
              <p className="text-sub text-sm">Topshiriqni bajarib, <span className="text-accent font-mono">.docx</span> faylini yuboring</p>
            </div>

            {/* Criteria */}
            {criteria && criteria.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
                  Baholash mezonlari
                </p>
                {criteria.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm text-sub">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      {c.nomi ?? c.label}
                    </div>
                    {c.maksimal_ball && (
                      <span className="font-mono text-xs text-muted">{c.maksimal_ball} ball</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`drop-zone rounded-2xl p-10 cursor-pointer text-center transition-all
                ${dragging ? 'dragging' : 'hover:border-muted'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const err = validateFile(f);
                  if (err) { setError(err); e.target.value = ''; return; }
                  setFile(f);
                  setError('');
                }}
              />
              {file ? (
                <div className="space-y-2">
                  <FileText size={36} className="text-accent mx-auto" />
                  <p className="text-text font-medium">{file.name}</p>
                  <p className="text-muted text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                  <p className="text-muted text-xs mt-1">Boshqa fayl tanlash uchun bosing</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload size={36} className="text-muted mx-auto" />
                  <p className="text-sub text-sm">Faylni bu yerga tashlang yoki bosing</p>
                  <p className="text-muted text-xs">.docx · maks 10MB</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-error text-sm bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                <XCircle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || phase === 'uploading'}
              className="w-full bg-accent text-bg font-mono font-semibold py-3.5 rounded-xl
                hover:bg-accent-dim transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {phase === 'uploading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Faylni yuborish
                </>
              )}
            </button>
          </div>
        )}

        {/* ─── DONE ─── */}
        {phase === 'done' && (
          <div className="animate-scale-in w-full max-w-md space-y-5">
            <div className="bg-surface border border-accent/30 rounded-2xl p-8 text-center space-y-4">
              <CheckCircle size={44} className="text-accent mx-auto" />
              <div>
                <p className="text-sub text-sm font-mono mb-1">Word fayl bali</p>
                <p className="text-5xl font-mono font-bold text-accent">{score.toFixed(1)}</p>
                <p className="text-sub text-sm mt-1">/ 25 ball</p>
              </div>
            </div>

            {feedback.length > 0 && (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-xs font-mono text-muted uppercase tracking-widest">
                    Baholash natijalari
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {feedback.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                      {f.passed
                        ? <CheckCircle size={14} className="text-accent mt-0.5 shrink-0" />
                        : <XCircle    size={14} className="text-error mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${f.passed ? 'text-text' : 'text-sub'}`}>{f.item}</p>
                        {f.hint && !f.passed && (
                          <p className="text-xs text-muted mt-0.5">{f.hint}</p>
                        )}
                      </div>
                      <span className={`font-mono text-sm font-semibold shrink-0
                        ${f.passed ? 'text-accent' : 'text-muted'}`}>
                        +{f.points.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/exam/pptx')}
              className="w-full bg-accent text-bg font-mono font-semibold py-3 rounded-xl
                hover:bg-accent-dim transition-all"
            >
              PowerPoint bosqichiga o'tish →
            </button>
          </div>
        )}
      </div>
    </ExamLayout>
  );
}