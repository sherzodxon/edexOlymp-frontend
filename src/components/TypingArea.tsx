'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { generateWordList, TEST_DURATION } from '@/lib/words';

export interface TypingResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctWords: number;
  totalWords: number;
  attemptNumber: number;
  timestamp: number;
}

interface Props {
  attemptNumber: number;
  onComplete: (result: TypingResult) => void;
}

type CharState = 'pending' | 'correct' | 'incorrect';

interface WordState {
  chars: { char: string; state: CharState }[];
  typed: string;
  skipped: boolean;
}

export default function TypingArea({ attemptNumber, onComplete }: Props) {
  const [words, setWords] = useState<string[]>([]);
  const [wordStates, setWordStates] = useState<WordState[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const tabooRef = useRef(false);

  // onComplete prop ni ref ichida saqlaymiz — parent har render onCompleteni
  // qayta yaratsa ham, bizning useEffect/useCallback bog'liqliklari o'zgarmaydi.
  // Bu juda muhim, chunki parent dagi 5-daqiqalik faza taymeri har soniyada
  // re-render qiladi va biz setIntervalni cancel qilmasligimiz kerak.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const ws = generateWordList(120);
    setWords(ws);
    setWordStates(ws.map(w => ({
      chars: w.split('').map(c => ({ char: c, state: 'pending' as CharState })),
      typed: '',
      skipped: false,
    })));
    setCurrentWordIdx(0);
    setCurrentInput('');
    setTimeLeft(TEST_DURATION);
    setStarted(false);
    setFinished(false);
    tabooRef.current = false;
  }, [attemptNumber]);

  const finish = useCallback((states: WordState[], wordList: string[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);

    let correctWords = 0;
    let totalTypedChars = 0;
    let correctChars = 0;

    states.forEach((ws, i) => {
      if (!ws.typed) return;
      totalTypedChars += ws.typed.length;
      const word = wordList[i];
      const correct = ws.typed === word;
      if (correct) correctWords++;
      for (let j = 0; j < Math.min(ws.typed.length, word.length); j++) {
        if (ws.typed[j] === word[j]) correctChars++;
      }
    });

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const minutes = elapsed / 60;
    const rawWpm = Math.round(totalTypedChars / 5 / minutes);
    const wpm = Math.round(correctWords / minutes);
    const accuracy = totalTypedChars > 0
      ? Math.round((correctChars / totalTypedChars) * 10000) / 100
      : 0;

    onCompleteRef.current({
      wpm: Math.max(0, wpm),
      rawWpm: Math.max(0, rawWpm),
      accuracy,
      correctWords,
      totalWords: states.filter(ws => ws.typed).length,
      attemptNumber,
      timestamp: Date.now(),
    });
  }, [attemptNumber]);

  useEffect(() => {
    if (!started || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setWordStates(prev => {
            setWords(ws => { finish(prev, ws); return ws; });
            return prev;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, finished, finish]);

  useEffect(() => {
    const container = wordsContainerRef.current;
    if (!container) return;
    const activeWord = container.querySelector('.word-active');
    if (activeWord) {
      const el = activeWord as HTMLElement;
      const containerTop = container.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      const offset = elTop - containerTop;
      if (offset > container.clientHeight * 0.5) {
        container.scrollTop += offset - container.clientHeight * 0.3;
      }
    }
  }, [currentWordIdx]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (finished) return;
    const val = e.target.value;
    if (!started && val.length > 2) { tabooRef.current = true; return; }
    if (tabooRef.current) return;
    if (!started && val.length > 0) { setStarted(true); startTimeRef.current = Date.now(); }

    if (val.endsWith(' ')) {
      const typed = val.trimEnd();
      setWordStates(prev => {
        const next = [...prev];
        next[currentWordIdx] = {
          ...next[currentWordIdx],
          typed,
          chars: next[currentWordIdx].chars.map((c, i) => ({
            ...c,
            state: i < typed.length ? typed[i] === c.char ? 'correct' : 'incorrect' : 'incorrect',
          })),
          skipped: typed.length < words[currentWordIdx].length,
        };
        return next;
      });
      setCurrentWordIdx(i => i + 1);
      setCurrentInput('');
      return;
    }

    setCurrentInput(val);
    setWordStates(prev => {
      const next = [...prev];
      const word = words[currentWordIdx];
      next[currentWordIdx] = {
        ...next[currentWordIdx],
        typed: val,
        chars: word.split('').map((c, i) => ({
          char: c,
          state: i < val.length ? val[i] === c ? 'correct' : 'incorrect' : 'pending',
        })),
      };
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && currentInput === '') e.preventDefault();
    if (e.key === 'Tab') e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    tabooRef.current = true;
  };

  const timerColor = timeLeft <= 5 ? 'text-error' : timeLeft <= 10 ? 'text-accent' : 'text-sub';
  const progress = ((TEST_DURATION - timeLeft) / TEST_DURATION) * 100;

  return (
    <div className="space-y-6 relative">
      {/* Timer — har urinish uchun 30s, yozishni boshlagandan boshlanadi */}
      <div className="flex items-center gap-4">
        <span className={`font-mono text-4xl font-light tabular-nums transition-colors ${timerColor}`}>
          {timeLeft}
        </span>
        <div className="flex-1 h-0.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Words */}
      <div
        ref={wordsContainerRef}
        className="relative h-36 overflow-hidden"
        style={{ maskImage: 'linear-gradient(transparent 0%, black 8%, black 92%, transparent 100%)' }}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap gap-x-3 gap-y-2 font-mono text-3xl leading-8">
          {wordStates.map((ws, wi) => (
            <span
              key={wi}
              className={`word inline-flex gap-0 ${wi === currentWordIdx ? 'word-active' : ''} ${ws.skipped ? 'wrong-word' : ''}`}
            >
              {ws.chars.map((c, ci) => {
                const isCursor = wi === currentWordIdx && ci === currentInput.length && started && !finished;
                return (
                  <span key={ci} className={`word-char ${c.state} ${isCursor ? 'cursor' : ''}`}>
                    {c.char}
                  </span>
                );
              })}
              {wi === currentWordIdx && currentInput.length > words[wi]?.length && (
                <span className="word-char incorrect">{currentInput.slice(words[wi]?.length)}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        value={currentInput}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={finished || tabooRef.current}
        className="opacity-0 absolute pointer-events-none w-0 h-0"
        aria-label="Typing input"
      />

      {!started && !finished && (
        <p className="text-center text-muted text-sm font-mono animate-pulse">
          bosing va yozishni boshlang... 30s urinish boshlanadi
        </p>
      )}
      {tabooRef.current && (
        <p className="text-center text-error text-sm font-mono">
          ⚠ Paste aniqlandi — urinish bekor. Sahifani yangilang.
        </p>
      )}
    </div>
  );
}
