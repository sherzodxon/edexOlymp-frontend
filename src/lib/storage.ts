// src/lib/storage.ts
import { StoredUser, TypingAttempt } from '@/types';

const STORAGE_KEY = 'edex_exam_user';
export const MAX_TYPING_ATTEMPTS = 3;

// Maksimal ballar
export const MAX_TYPING_SCORE = 25;   // wpm * 0.5, 50+ wpm = 25
export const MAX_TEST_SCORE   = 20;   // 20 ta savol, har biriga 1 ball
export const MAX_DOCS_SCORE   = 20;
export const MAX_PPTX_SCORE   = 25;
export const MAX_TOTAL_SCORE  = MAX_TYPING_SCORE + MAX_TEST_SCORE + MAX_DOCS_SCORE + MAX_PPTX_SCORE; // 90

// Typing ball formulasi: wpm * 0.5, max 25
export function calcTypingScore(wpm: number): number {
  return parseFloat(Math.min(wpm * 0.5, MAX_TYPING_SCORE).toFixed(2));
}

export function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredUser>;
    // Eski formatdagi kuki/storagega backward-compat
    return {
      userInfo: parsed.userInfo!,
      typingAttempts: parsed.typingAttempts ?? [],
      typingDone: parsed.typingDone ?? false,
      testDone:   parsed.testDone   ?? false,
      docsDone:   parsed.docsDone   ?? false,
      pptxDone:   parsed.pptxDone   ?? false,
      typingScore: parsed.typingScore ?? 0,
      testScore:   parsed.testScore   ?? 0,
      docsScore:   parsed.docsScore   ?? 0,
      pptxScore:   parsed.pptxScore   ?? 0,
    };
  } catch {
    return null;
  }
}

export function saveStoredUser(user: StoredUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function addTypingAttempt(result: TypingAttempt): StoredUser | null {
  const user = getStoredUser();
  if (!user) return null;
  if (user.typingAttempts.length >= MAX_TYPING_ATTEMPTS) return user;

  const last = user.typingAttempts[user.typingAttempts.length - 1];
  if (last && last.wpm === result.wpm && last.accuracy === result.accuracy) {
    return user;
  }

  user.typingAttempts.push({
    ...result,
    attemptNumber: user.typingAttempts.length + 1,
  });

  saveStoredUser(user);
  return user;
}

export function getBestTyping(attempts: TypingAttempt[]): TypingAttempt | null {
  if (!attempts.length) return null;
  return attempts.reduce((best, curr) => (curr.wpm > best.wpm ? curr : best));
}

export type ExamPhase = 'typing' | 'test' | 'docs' | 'pptx' | 'done';

export function getCurrentPhase(user: StoredUser): ExamPhase {
  if (user.pptxDone) return 'done';
  if (user.docsDone) return 'pptx';
  if (user.testDone) return 'docs';
  if (user.typingDone) return 'test';
  return 'typing';
}
