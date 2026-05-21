import { useState } from 'react';
import { theme, panel, button } from './theme';

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
      minHeight: '100vh', background: theme.page, color: theme.ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: 'min(100%, 380px)', textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: theme.inkSoft, fontFamily: theme.body, fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>
          A shared family record
        </div>
        <h1 style={{
          fontFamily: theme.display, fontSize: 'clamp(40px, 11vw, 68px)', fontWeight: 400,
          color: theme.red, margin: '0 0 6px', letterSpacing: 2, textShadow: '3px 3px 0 ' + theme.ink,
        }}>
          Family Atlas
        </h1>
        <p style={{ fontFamily: theme.body, fontWeight: 800, color: theme.inkSoft, fontSize: 16, marginBottom: 28 }}>
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
              width: '100%', padding: '13px 15px', borderRadius: theme.radiusSm,
              background: theme.white, border: theme.outline,
              color: theme.ink, fontSize: 15, fontFamily: theme.body, fontWeight: 800, outline: 'none',
              textAlign: 'center', letterSpacing: 1, boxSizing: 'border-box',
            }}
          />
          {error && (
            <div style={{ fontFamily: theme.body, fontWeight: 800, fontSize: 13, color: theme.red, minHeight: 18 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !password}
            style={{
              ...button(theme.red),
              padding: '13px 18px', fontSize: 16,
              cursor: busy || !password ? 'not-allowed' : 'pointer',
              opacity: busy || !password ? 0.55 : 1,
              color: theme.white,
            }}
          >
            {busy ? 'Opening...' : 'Enter the Atlas'}
          </button>
        </form>
      </div>
    </div>
  );
}
