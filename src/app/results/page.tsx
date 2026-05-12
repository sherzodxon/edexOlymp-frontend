'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, MAX_TYPING_SCORE, MAX_TEST_SCORE, MAX_DOCS_SCORE, MAX_PPTX_SCORE, MAX_TOTAL_SCORE } from '@/lib/storage';
import { StoredUser } from '@/types';
import { Trophy, Keyboard, FileQuestion, FileText, Presentation } from 'lucide-react';
import Link from 'next/link';

export default function ResultsPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/register'); return; }
    setUser(stored);
  }, [router]);

  if (!user) return null;

  const total = user.typingScore + user.testScore + user.docsScore + user.pptxScore;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.025] grid-bg" />

      <div className="w-full max-w-md animate-slide-up space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Trophy size={44} className="text-accent mx-auto" />
          <h1 className="text-2xl font-semibold text-text">Imtihon yakunlandi!</h1>
          <p className="text-sub text-sm">
            {user.userInfo.firstName} {user.userInfo.lastName} · {user.userInfo.grade}-sinf
          </p>
          <p className="text-muted text-xs">{user.userInfo.school}</p>
        </div>

        {/* Total */}
        <div className="bg-surface border border-accent/30 rounded-2xl p-6 text-center">
          <p className="text-sub text-xs font-mono uppercase tracking-widest mb-2">Umumiy ball</p>
          <p className="text-6xl font-mono font-bold text-accent">{total.toFixed(1)}</p>
          <p className="text-sub text-sm mt-1">/ {MAX_TOTAL_SCORE} ball</p>
          {/* Score bar */}
          <div className="mt-5 h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((total / MAX_TOTAL_SCORE) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <ScoreRow
            icon={<Keyboard size={16} />}
            label="Typing"
            sub="WPM × 0.5 (max)"
            score={user.typingScore}
            max={MAX_TYPING_SCORE}
            color="accent"
          />
          <ScoreRow
            icon={<FileQuestion size={16} />}
            label="Test"
            sub="20 savol × 1 ball"
            score={user.testScore}
            max={MAX_TEST_SCORE}
            color="accent"
          />
          <ScoreRow
            icon={<FileText size={16} />}
            label="Word fayl"
            sub="Mezon asosida"
            score={user.docsScore}
            max={MAX_DOCS_SCORE}
            color="accent"
          />
          <ScoreRow
            icon={<Presentation size={16} />}
            label="PowerPoint fayl"
            sub="Mezon asosida"
            score={user.pptxScore}
            max={MAX_PPTX_SCORE}
            color="accent"
            last
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/leaderboard"
            className="w-full flex items-center justify-center gap-2 bg-surface border border-border
              text-text font-mono text-sm py-3 rounded-xl hover:border-muted transition-all">
            🏆 Reytingni ko'rish
          </Link>
        </div>

        <p className="text-center text-muted text-xs font-mono">
          Natijalaringiz serverda saqlangan
        </p>
      </div>
    </div>
  );
}

function ScoreRow({
  icon, label, sub, score, max, color, last,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  score: number;
  max: number;
  color: string;
  last?: boolean;
}) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className={`px-5 py-4 ${!last ? 'border-b border-border' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sub">
          {icon}
          <div>
            <span className="text-text text-sm font-medium">{label}</span>
            <span className="text-muted text-xs ml-2">{sub}</span>
          </div>
        </div>
        <span className="font-mono font-bold text-accent">
          {score.toFixed(1)}<span className="text-muted text-xs font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
