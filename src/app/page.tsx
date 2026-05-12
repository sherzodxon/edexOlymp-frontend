'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getCurrentPhase } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/register');
    } else {
      const phase = getCurrentPhase(user);
      if (phase === 'typing') router.replace('/exam/typing');
      else if (phase === 'test') router.replace('/exam/test');
      else if (phase === 'docs') router.replace('/exam/docs');
      else if (phase === 'pptx') router.replace('/exam/pptx');
      else router.replace('/results');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
