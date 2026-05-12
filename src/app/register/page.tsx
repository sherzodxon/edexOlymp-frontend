'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, saveStoredUser, generateToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { SCHOOLS } from '@/lib/schools';
import EdexLogo from '@/ui/logo';

const GRADES = [5, 6, 7, 8, 9, 10, 11];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '', lastName: '', school: '', grade: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user) router.replace('/');
  }, [router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Ism kiritilishi shart';
    if (!form.lastName.trim()) e.lastName = 'Familiya kiritilishi shart';
    if (!form.school) e.school = 'Maktab tanlanishi shart';
    if (!form.grade) e.grade = 'Sinf tanlanishi shart';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);

    const token = generateToken();
    try {
      await api.register({
        token,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        school: form.school,
        grade: parseInt(form.grade),
      });

      saveStoredUser({
        userInfo: {
          token,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          school: form.school,
          grade: parseInt(form.grade),
        },
        typingAttempts: [],
        typingDone: false,
        testDone: false,
        docsDone: false,
        pptxDone: false,
        typingScore: 0,
        testScore: 0,
        docsScore: 0,
        pptxScore: 0,
      });

      // Yangi talaba — typing fazasi taymeri reset qilinadi
      try { localStorage.removeItem('edex_typing_phase_deadline'); } catch {}

      router.push('/exam/typing');
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : 'Xato yuz berdi' });
      setLoading(false);
    }
  };

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025] grid-bg" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-10 text-center">
         
          <h1 className="font-mono text-3xl mt-6 text-accent font-semibold tracking-tight flex items-center text-center justify-center">
           <EdexLogo className="w-12 h-12" />EdEx<span className="text-white">-exam</span>
          </h1>
          <p className="text-sub text-sm mt-2 font-light">
            4 bosqichli kompyuter savodxonligi imtihoni
          </p>
        </div>

        {/* Steps hint */}
        <div className="flex items-center gap-2 mb-8 px-1">
          {['Typing', 'Test', 'Word', 'PPTX'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-mono text-muted">
                  {i + 1}
                </div>
                <span className="text-xs text-muted font-mono">{s}</span>
              </div>
              {i < 3 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 space-y-5">
          <h2 className="text-base font-medium text-text">Ro'yxatdan o'tish</h2>

          {/* Ism / Familiya */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ism" value={form.firstName} error={errors.firstName}
              onChange={(v) => set('firstName', v)} placeholder="Jasur" />
            <Field label="Familiya" value={form.lastName} error={errors.lastName}
              onChange={(v) => set('lastName', v)} placeholder="Toshmatov" />
          </div>

          {/* Maktab */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-sub uppercase tracking-widest">Maktab</label>
            <select
              value={form.school}
              onChange={(e) => set('school', e.target.value)}
              className={`w-full bg-bg border rounded-xl px-4 py-3 font-sans text-sm text-text
                outline-none transition-all duration-150 appearance-none cursor-pointer
                ${errors.school ? 'border-error' : 'border-border focus:border-accent'}`}
            >
              <option value="" disabled>— Maktabni tanlang —</option>
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.school && <p className="text-error text-xs">{errors.school}</p>}
          </div>

          {/* Sinf */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-sub uppercase tracking-widest">Sinf</label>
            <div className="grid grid-cols-7 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => set('grade', String(g))}
                  className={`py-2.5 rounded-xl border font-mono text-sm font-medium
                    transition-all duration-150
                    ${form.grade === String(g)
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted hover:border-muted'}`}
                >
                  {g}
                </button>
              ))}
            </div>
            {errors.grade && <p className="text-error text-xs">{errors.grade}</p>}
          </div>

          {errors.submit && (
            <p className="text-error text-sm bg-error/10 border border-error/20 rounded-xl px-4 py-3">
              {errors.submit}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-2 bg-accent text-bg font-mono font-semibold py-3 rounded-xl
              hover:bg-accent-dim active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                Yuklanmoqda...
              </span>
            ) : (
              'Imtihonni Boshlash →'
            )}
          </button>
        </div>

        <p className="text-center text-muted text-xs mt-6 font-mono">
          Token avtomatik yaratiladi va brauzerda saqlanadi
        </p>
      </div>
    </main>
  );
}

function Field({
  label, value, error, onChange, placeholder,
}: {
  label: string; value: string; error?: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-sub uppercase tracking-widest">{label}</label>
      <input
        type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-bg border rounded-xl px-4 py-3 font-sans text-sm text-text
          placeholder:text-muted outline-none transition-all duration-150
          ${error ? 'border-error focus:border-error' : 'border-border focus:border-accent'}`}
      />
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
