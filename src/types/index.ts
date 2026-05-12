// src/types/index.ts

export interface UserInfo {
  firstName: string;
  lastName: string;
  school: string;
  grade: number;
  token: string;
}

export interface TypingAttempt {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctWords: number;
  totalWords: number;
  attemptNumber: number;
  score: number;
  timestamp: number;
}

export interface StoredUser {
  userInfo: UserInfo;
  typingAttempts: TypingAttempt[];
  typingDone: boolean;
  testDone: boolean;
  docsDone: boolean;
  pptxDone: boolean;
  typingScore: number;
  testScore: number;
  docsScore: number;
  pptxScore: number;
}

// Admin types
export interface AdminStudent {
  id: number;
  token: string;
  firstName: string;
  lastName: string;
  school: string;
  grade: number;
  typingScore: number;
  testScore: number;
  docsScore: number;
  pptxScore: number;
  totalScore: number;
  status: 'TYPING' | 'TEST' | 'DOCS' | 'PPTX' | 'COMPLETED';
  createdAt: string;
  typingAttempts: AdminTypingAttempt[];
  testSession: AdminTestSession | null;
  docsSubmission: AdminDocsSubmission | null;
  pptxSubmission: AdminPptxSubmission | null;
}

export interface AdminTypingAttempt {
  id: number;
  attemptNumber: number;
  wpm: number;
  accuracy: number;
  score: number;
}

export interface AdminTestSession {
  score: number;
  isCompleted: boolean;
  startedAt: string;
  finishedAt: string | null;
}

export interface AdminDocsSubmission {
  score: number;
  fileName: string;
  isChecked: boolean;
}

export interface AdminPptxSubmission {
  score: number;
  fileName: string;
  isChecked: boolean;
}

export interface TestQuestion {
  id: number;
  grade: number;
  questionText: string;
  imageUrl?: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string;
  orderIndex: number;
  isActive: boolean;
}

export interface ExamConfig {
  id: number;
  typingTimeLimitSec: number;
  testTimeLimitSec: number;
  docsTimeLimitSec: number;
  pptxTimeLimitSec: number;
  docsCriteria: string;
  pptxCriteria: string;
}

export interface LeaderboardEntry {
  id: number;
  firstName: string;
  lastName: string;
  school: string;
  grade: number;
  typingScore: number;
  testScore: number;
  docsScore: number;
  pptxScore: number;
  totalScore: number;
  rank: number;
}
