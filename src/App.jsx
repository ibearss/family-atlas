import { useState, useEffect, useCallback } from 'react';
import WorldMap from './WorldMap';
import PinModal from './PinModal';
import DropPinModal from './DropPinModal';
import Login from './Login';
import { nameToColor } from './colors';

const LS_NAME_KEY = 'family-atlas-name';

function usePins() {
  const [pins, setPins] = useState([]);

  useEffect(() => {
    let isCancelled = false;
    fetch('/api/pins')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!isCancelled) setPins(data); })
      .catch(console.error);

    const evs = new EventSource('/api/events');
    evs.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'add') {
        setPins(prev => prev.some(p => p.id === msg.pin.id) ? prev : [...prev, msg.pin]);
      } else if (msg.type === 'remove') {
        setPins(prev => prev.filter(p => p.id !== msg.id));
      } else if (msg.type === 'edit') {
        setPins(prev => prev.map(p => p.id === msg.pin.id ? msg.pin : p));
      } else if (msg.type === 'photo_add') {
        setPins(prev => prev.map(p => p.id === msg.pinId ? { ...p, photo_count: (p.photo_count || 0) + 1 } : p));
      } else if (msg.type === 'photo_remove') {
        setPins(prev => prev.map(p => p.id === msg.pinId ? { ...p, photo_count: Math.max(0, (p.photo_count || 1) - 1) } : p));
      }
    };
    return () => { isCancelled = true; evs.close(); };
  }, []);

  const addPin = useCallback(async (pin) => {
    const res = await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pin),
    });
    if (!res.ok) throw new Error('Failed to save pin');
    const saved = await res.json();
    setPins(prev => prev.some(p => p.id === saved.id) ? prev : [...prev, saved]);
    return saved;
  }, []);

  const editPin = useCallback(async (id, updates) => {
    const res = await fetch(`/api/pins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update pin');
    const updated = await res.json();
    setPins(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  const removePin = useCallback(async (id) => {
    const prev = pins;
    setPins(p => p.filter(x => x.id !== id));
    try {
      const res = await fetch(`/api/pins/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setPins(prev);
    }
  }, [pins]);

  const refreshPhotoCounts = useCallback(() => {
    fetch('/api/pins').then(r => r.json()).then(setPins).catch(console.error);
  }, []);

  return { pins, addPin, editPin, removePin, refreshPhotoCounts };
}

function Atlas({ onSignOut }) {
  const [name, setName] = useState(() => localStorage.getItem(LS_NAME_KEY) || '');
  const [filterPerson, setFilterPerson] = useState('all');
  const [pendingCoords, setPendingCoords] = useState(null);
  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const { pins, addPin, editPin, removePin, refreshPhotoCounts } = usePins();

  // Keep selectedPin in sync with the pins array (handles edits from other sessions)
  useEffect(() => {
    if (!selectedPin) return;
    const updated = pins.find(p => p.id === selectedPin.id);
    if (updated) setSelectedPin(updated);
    else setSelectedPin(null);
  }, [pins]);

  const people = [...new Set(pins.map(p => p.name))].sort();
  const visiblePins = filterPerson === 'all' ? pins : pins.filter(p => p.name === filterPerson);

  function handleMapClick(coords) {
    setPendingCoords(coords);
    setDropModalOpen(true);
  }

  function closeDropModal() {
    setDropModalOpen(false);
    setPendingCoords(null);
  }

  async function handleDropConfirm(pinData) {
    await addPin(pinData);
    localStorage.setItem(LS_NAME_KEY, pinData.name);
    setName(pinData.name);
    closeDropModal();
  }

  async function handleDeletePin(id) {
    setSelectedPin(null);
    await removePin(id);
  }

  async function handleEditPin(id, updates) {
    await editPin(id, updates);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#13100d', color: '#f0e3c4' }}>

      {/* Header */}
      <header style={{ textAlign: 'center', padding: 'clamp(28px, 5vw, 52px) 16px 20px' }}>
        <div style={{ fontSize: 10, letterSpacing: 5, color: '#8b7040', fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>
          A shared family record
        </div>
        <h1 style={{
          fontFamily: 'EB Garamond, serif',
          fontSize: 'clamp(36px, 8vw, 76px)',
          fontWeight: 700, color: '#d4a843', margin: 0, letterSpacing: 3,
          textShadow: '0 2px 24px rgba(212,168,67,0.25)',
        }}>
          Family Atlas
        </h1>
        <p style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: 'rgba(240,227,196,0.45)', fontSize: 'clamp(14px, 2.5vw, 18px)', marginTop: 6 }}>
          Where we live &amp; where we've wandered
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <div style={{ height: 1, width: 50, background: 'linear-gradient(to right, transparent, #6b4f2a)' }} />
          <div style={{ width: 5, height: 5, background: '#8b6535', transform: 'rotate(45deg)' }} />
          <div style={{ height: 1, width: 50, background: 'linear-gradient(to left, transparent, #6b4f2a)' }} />
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '0 clamp(12px, 3vw, 24px) 80px' }}>

        {/* Stats */}
        {pins.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 5vw, 44px)', marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { n: pins.length, label: 'Pins' },
              { n: people.length, label: 'Travelers' },
              { n: pins.filter(p => p.type === 'home').length, label: 'Homes' },
              { n: pins.filter(p => p.type === 'travel').length, label: 'Trips' },
            ].map(({ n, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 700, color: '#d4a843', lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, letterSpacing: 1.5, color: 'rgba(240,227,196,0.35)', textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Controls bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={() => setDropModalOpen(true)}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #c9a84c, #8b6030)',
              color: '#13100d', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            + Drop a Pin
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {people.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(212,168,67,0.55)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  Show
                </label>
                <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,168,67,0.2)',
                  borderRadius: 8, padding: '7px 11px',
                  fontSize: 13, fontFamily: 'Inter, sans-serif',
                  color: '#f0e3c4',
                }}>
                  <option value="all">Everyone</option>
                  {people.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
            <button onClick={onSignOut} title="Sign out" style={{
              background: 'none', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8,
              padding: '7px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', color: 'rgba(240,227,196,0.5)',
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Globe */}
        <WorldMap pins={visiblePins} onMapClick={handleMapClick} pendingCoords={pendingCoords} onPinClick={setSelectedPin} />

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap', fontFamily: 'EB Garamond, serif', color: 'rgba(240,227,196,0.4)', fontSize: 13 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e03030', display: 'inline-block' }} /> Home
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2a80cc', display: 'inline-block' }} /> Travel
          </span>
          <span style={{ fontStyle: 'italic' }}>Click globe or use button to drop a pin · scroll to zoom · drag to rotate</span>
        </div>

        {/* Pin list */}
        {visiblePins.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'EB Garamond, serif', fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 600, color: '#d4a843', margin: 0 }}>
                {filterPerson === 'all' ? 'All Pins' : `${filterPerson}'s Pins`}
              </h2>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(240,227,196,0.28)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {visiblePins.length} {visiblePins.length === 1 ? 'entry' : 'entries'}
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(212,168,67,0.12)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {visiblePins.map(pin => {
                const personColor = nameToColor(pin.name);
                return (
                  <div key={pin.id}
                    onClick={() => setSelectedPin(pin)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${personColor}30`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: `${personColor}22`, border: `2px solid ${personColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                      }}>
                        {pin.type === 'home' ? '🏠' : '✈'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 15, fontWeight: 600, color: personColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pin.name}
                        </div>
                        <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 13, color: 'rgba(240,227,196,0.55)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pin.place}
                        </div>
                        {pin.notes && (
                          <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 12, color: 'rgba(240,227,196,0.3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pin.notes}
                          </div>
                        )}
                      </div>
                      {pin.photo_count > 0 && (
                        <span style={{
                          fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
                          background: 'rgba(212,168,67,0.12)', color: '#d4a843',
                          border: '1px solid rgba(212,168,67,0.25)', borderRadius: 10,
                          padding: '2px 6px', flexShrink: 0,
                        }}>
                          📷 {pin.photo_count}
                        </span>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); removePin(pin.id); }} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(240,227,196,0.15)', fontSize: 20, lineHeight: 1,
                      padding: '0 4px', flexShrink: 0, transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => e.target.style.color = '#e05050'}
                      onMouseLeave={e => e.target.style.color = 'rgba(240,227,196,0.15)'}
                    >×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {dropModalOpen && (
        <DropPinModal
          coords={pendingCoords}
          defaultName={name}
          onConfirm={handleDropConfirm}
          onCancel={closeDropModal}
        />
      )}

      {selectedPin && (
        <PinModal
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
          onPhotoChange={refreshPhotoCounts}
          onDelete={handleDeletePin}
          onEdit={handleEditPin}
        />
      )}

      <style>{`
        select option { background: #1a160f; color: #f0e3c4; }
      `}</style>
    </div>
  );
}

export default function App() {
  // null = still checking the session, false = locked, true = signed in.
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then(r => (r.ok ? r.json() : { authenticated: false }))
      .then(d => { if (!cancelled) setAuthed(Boolean(d.authenticated)); })
      .catch(() => { if (!cancelled) setAuthed(false); });
    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore network errors on logout */ }
    setAuthed(false);
  }

  if (authed === null) return <div style={{ minHeight: '100vh', background: '#13100d' }} />;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Atlas onSignOut={signOut} />;
}
