const BASE = "https://edex-olymp.onrender.com";
console.log(BASE);

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'So\'rov amalga oshmadi');
  return data;
}

function adminHeaders(key: string) {
  return { 'x-admin-key': key, 'Content-Type': 'application/json' };
}

// ── Student ─────────────────────────────────
export const api = {
  register(data: { token: string; firstName: string; lastName: string; school: string; grade: number }) {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
  },

  getProfile(token: string) {
    return request(`/api/student/${token}`);
  },

  // ── Typing ──────────────────────────────────
  submitTypingAttempt(data: {
    token: string; wpm: number; rawWpm: number;
    accuracy: number; correctWords: number; totalWords: number;
  }) {
    return request('/api/typing/attempt', { method: 'POST', body: JSON.stringify(data) });
  },

  // ── Test ────────────────────────────────────
  startTest(token: string) {
    return request('/api/test/start', { method: 'POST', body: JSON.stringify({ token }) });
  },

  getTestQuestions(token: string) {
    return request(`/api/test/questions/${token}`);
  },

  submitTest(data: { token: string; answers: { questionId: number; selectedOption: string }[] }) {
    return request('/api/test/submit', { method: 'POST', body: JSON.stringify(data) });
  },

  // ── Docs (Word) ─────────────────────────────
  async uploadDoc(token: string, file: File) {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('file', file);
    const res = await fetch(`${BASE}/api/docs/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fayl yuklanmadi');
    return data;
  },

  getDocsStatus(token: string) {
    return request(`/api/docs/status/${token}`);
  },

  // ── PPTX (PowerPoint) ───────────────────────
  async uploadPptx(token: string, file: File) {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('file', file);
    const res = await fetch(`${BASE}/api/pptx/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fayl yuklanmadi');
    return data;
  },

  getPptxStatus(token: string) {
    return request(`/api/pptx/status/${token}`);
  },

  // ── Leaderboard ─────────────────────────────
  getLeaderboard() {
    return request('/api/leaderboard');
  },

  // ── Admin ────────────────────────────────────
  adminGetResults(key: string, params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(`${BASE}/api/admin/results${qs}`, { headers: adminHeaders(key) }).then((r) => r.json());
  },

  adminGetQuestions(key: string, grade?: number) {
    const qs = grade !== undefined ? `?grade=${grade}` : '';
    return fetch(`${BASE}/api/admin/questions${qs}`, { headers: adminHeaders(key) }).then((r) => r.json());
  },

  adminCreateQuestion(key: string, data: object) {
    return fetch(`${BASE}/api/admin/questions`, {
      method: 'POST',
      headers: adminHeaders(key),
      body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  adminDeleteQuestion(key: string, id: number) {
    return fetch(`${BASE}/api/admin/questions/${id}`, { method: 'DELETE', headers: adminHeaders(key) }).then((r) => r.json());
  },

  adminGetConfig(key: string) {
    return fetch(`${BASE}/api/admin/config`, { headers: adminHeaders(key) }).then((r) => r.json());
  },

  adminUpdateConfig(key: string, data: object) {
    return fetch(`${BASE}/api/admin/config`, {
      method: 'PUT',
      headers: adminHeaders(key),
      body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  adminDeleteStudent(key: string, id: number) {
    return fetch(`${BASE}/api/admin/students/${id}`, { method: 'DELETE', headers: adminHeaders(key) }).then((r) => r.json());
  },

  getExportUrl(key: string) {
    return `${BASE}/api/admin/export?key=${key}`;
  },
};
