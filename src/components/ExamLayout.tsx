'use client';

import EdexLogo from '@/ui/logo';
import { ReactNode } from 'react';

type Phase = 'typing' | 'test' | 'docs' | 'pptx';

const STEPS = [
  { key: 'typing', label: 'Typing',     desc: '5 daqiqa' },
  { key: 'test',   label: 'Test',       desc: '20 savol' },
  { key: 'docs',   label: 'Word',       desc: 'Fayl yuklash' },
  { key: 'pptx',   label: 'PowerPoint', desc: 'Fayl yuklash' },
];

export default function ExamLayout({
  children,
  phase,
}: {
  children: ReactNode;
  phase: Phase;
}) {
  const currentIdx = STEPS.findIndex((s) => s.key === phase);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="font-mono text-3xl text-accent font-semibold tracking-tight flex items-center text-center justify-center">
           <EdexLogo className="w-12 h-12" />EdEx<span className="text-white">-exam</span>
          </h1>

        {/* Steps */}
        <div className="flex items-center gap-1">
          {STEPS.map((step, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: isActive ? 'rgba(39,165,93,0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(39,165,93,0.3)' : '1px solid transparent',
                  }}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold
                    ${isDone ? 'bg-accent text-bg' : isActive ? 'border border-accent text-accent' : 'border border-border text-muted'}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-mono font-medium ${isActive ? 'text-accent' : isDone ? 'text-sub' : 'text-muted'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${i < currentIdx ? 'bg-accent' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
