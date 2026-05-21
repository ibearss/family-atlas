import { useState } from 'react';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Incorrect password.');
        setPassword('');
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#13100d', color: '#f0e3c4',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: 'min(100%, 380px)', textAlign: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: 5, color: '#8b7040', fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>
          A shared family record
        </div>
        <h1 style={{
          fontFamily: 'EB Garamond, serif', fontSize: 'clamp(34px, 9vw, 56px)', fontWeight: 700,
          color: '#d4a843', margin: '0 0 6px', letterSpacing: 3, textShadow: '0 2px 24px rgba(212,168,67,0.25)',
        }}>
          Family Atlas
        </h1>
        <p style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: 'rgba(240,227,196,0.45)', fontSize: 16, marginBottom: 28 }}>
          Where we live &amp; where we've wandered
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Family password"
            autoFocus
            autoComplete="current-password"
            style={{
              width: '100%', padding: '13px 15px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,168,67,0.25)',
              color: '#f0e3c4', fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none',
              textAlign: 'center', letterSpacing: 1,
            }}
          />
          {error && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#e88', minHeight: 18 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !password}
            style={{
              padding: '13px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', border: 'none',
              cursor: busy || !password ? 'not-allowed' : 'pointer',
              opacity: busy || !password ? 0.55 : 1,
              background: 'linear-gradient(135deg, #c9a84c, #8b6030)', color: '#13100d',
              transition: 'opacity 0.15s',
            }}
          >
            {busy ? 'Opening...' : 'Enter the Atlas'}
          </button>
        </form>
      </div>
    </div>
  );
}
