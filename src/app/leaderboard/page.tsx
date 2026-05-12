'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { LeaderboardEntry } from '@/types';
import { Trophy, Medal, Keyboard, FileQuestion, FileText, Presentation, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardData {
  all?: { label: string; students: LeaderboardEntry[] };
  [key: string]: { label: string; students: LeaderboardEntry[] } | undefined;
}

const AUTO_REFRESH_SEC = 600;  // har 10 daqiqada yangilanadi

export default function LeaderboardPage() {
  const [students,   setStudents]   = useState<LeaderboardEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshIn,  setRefreshIn]  = useState(AUTO_REFRESH_SEC);

  const refreshRafRef = useRef<number>(0);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await api.getLeaderboard() as { data?: LeaderboardData; students?: LeaderboardEntry[] };
      // Yangi format — barcha sinflar bo'yicha yagona ro'yxat
      if (res.students && Array.isArray(res.students)) {
        setStudents(res.students);
      } else if (res.data?.all?.students) {
        setStudents(res.data.all.students);
      } else if (res.data) {
        // Eski format — barcha guruhlardan birlashtiramiz
        const merged: LeaderboardEntry[] = [];
        for (const key of Object.keys(res.data)) {
          const grp = res.data[key as keyof LeaderboardData];
          if (grp?.students) merged.push(...grp.students);
        }
        merged.sort((a, b) => b.totalScore - a.totalScore);
        setStudents(merged.map((s, i) => ({ ...s, rank: i + 1 })));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  const startRefreshTicker = useCallback((deadlineMs: number) => {
    cancelAnimationFrame(refreshRafRef.current);
    const tick = () => {
      const rem = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setRefreshIn(rem);
      if (rem <= 0) {
        load(true);
        const next = Date.now() + AUTO_REFRESH_SEC * 1000;
        startRefreshTicker(next);
        return;
      }
      refreshRafRef.current = requestAnimationFrame(tick);
    };
    refreshRafRef.current = requestAnimationFrame(tick);
  }, [load]);

  useEffect(() => {
    load();
    const rfDl = Date.now() + AUTO_REFRESH_SEC * 1000;
    startRefreshTicker(rfDl);
    return () => { cancelAnimationFrame(refreshRafRef.current); };
  }, [load, startRefreshTicker]);

  const handleManualRefresh = () => {
    load(true);
    const next = Date.now() + AUTO_REFRESH_SEC * 1000;
    startRefreshTicker(next);
  };

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] grid-bg" />
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={24} className="text-accent" />
            <h1 className="text-xl font-semibold text-text font-mono">Umumiy reyting</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted text-xs font-mono hidden sm:block">
              yangilanadi: {fmtTime(refreshIn)}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-muted hover:text-sub text-xs font-mono
                border border-border rounded-lg px-2.5 py-1.5 hover:border-muted transition-all disabled:opacity-40"
            >
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              Yangilash
            </button>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl px-4 py-3 text-xs text-muted font-mono">
          Barcha sinflar bo'yicha yagona reyting · g'oliblar umumiy ro'yxatdan aniqlanadi
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-muted font-mono text-sm">
            Hali natijalar yo'q
          </div>
        ) : (
          <div className="space-y-3">

            {/* Top 3 podium */}
            {students.length >= 3 && (
              <div className="grid grid-cols-3 items-end gap-3">
                {[students[1], students[0], students[2]].map((s, i) => {
                  const colors = [
                    'border-sub/30 bg-sub/5',
                    'border-accent/40 bg-accent/5',
                    'border-orange-500/30 bg-orange-500/5',
                  ];
                  const heights = ['h-32', 'h-44', 'h-28'];
                  const medals  = ['🥈', '🥇', '🥉'];
                  return (
                    <div key={s.id}
                      className={`${colors[i]} border rounded-xl p-3 text-center flex flex-col
                        items-center justify-end ${heights[i]} transition-all`}
                    >
                      <div className="text-2xl mb-1">{medals[i]}</div>
                      <p className="text-text text-xs font-semibold truncate w-full">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-muted text-[10px] truncate w-full">{s.grade}-sinf · {s.school}</p>
                      <p className="text-accent font-mono font-bold text-sm mt-1">
                        {s.totalScore.toFixed(1)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border
                text-muted text-xs font-mono uppercase tracking-widest">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Talaba</div>
                <div className="col-span-2 hidden sm:block">Maktab</div>
                <div className="col-span-1 text-center"><Keyboard size={10} className="inline" /></div>
                <div className="col-span-1 text-center"><FileQuestion size={10} className="inline" /></div>
                <div className="col-span-1 text-center"><FileText size={10} className="inline" /></div>
                <div className="col-span-1 text-center"><Presentation size={10} className="inline" /></div>
                <div className="col-span-2 text-right">Jami</div>
              </div>

              {students.map((s, i) => (
                <div key={s.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3.5 items-center text-sm
                    ${i !== students.length - 1 ? 'border-b border-border' : ''}
                    ${i < 3 ? 'bg-accent/[0.1]' : ''}`}
                >
                  <div className="col-span-1">
                    {i === 0 ? <Trophy size={18} className="text-yellow-600" />
                      : i === 1 ? <Medal size={18} className="text-gray-600" />
                      : i === 2 ? <Medal size={18} className="text-orange-600" />
                      : <span className="text-muted font-mono text-xs">{i + 1}</span>}
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-text font-medium truncate">{s.firstName} {s.lastName}</p>
                    <p className="text-muted text-xs">{s.grade}-sinf</p>
                  </div>
                  <div className="col-span-2 text-muted text-xs truncate hidden sm:block">{s.school}</div>
                  <div className="col-span-1 text-center font-mono text-xs text-sub">{s.typingScore.toFixed(0)}</div>
                  <div className="col-span-1 text-center font-mono text-xs text-sub">{s.testScore.toFixed(0)}</div>
                  <div className="col-span-1 text-center font-mono text-xs text-sub">{s.docsScore.toFixed(0)}</div>
                  <div className="col-span-1 text-center font-mono text-xs text-sub">{(s.pptxScore ?? 0).toFixed(0)}</div>
                  <div className="col-span-2 text-right font-mono font-bold text-accent">
                    {s.totalScore.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/results" className="text-muted text-xs font-mono hover:text-sub transition-colors">
            ← Mening natijalarim
          </Link>
        </div>
      </div>
    </div>
  );
}
