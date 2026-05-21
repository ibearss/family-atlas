import { useState, useEffect, useCallback } from 'react';
import WorldMap from './WorldMap';
import PinModal from './PinModal';
import DropPinModal from './DropPinModal';
import Login from './Login';
import TimelineView from './TimelineView';
import SearchBar from './SearchBar';
import PhotoGallery from './PhotoGallery';
import Onboarding from './Onboarding';
import AddressSearch from './AddressSearch';
import { nameToColor } from './colors';
import { theme, panel, button, chip } from './theme';

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
  const [lowerView, setLowerView] = useState('list'); // 'list' | 'timeline'
  const [galleryPhotos, setGalleryPhotos] = useState(null);
  const [showOnboard, setShowOnboard] = useState(() => !localStorage.getItem('family-atlas-onboarded'));
  const [focusCoords, setFocusCoords] = useState(null);
  const [prefillPlace, setPrefillPlace] = useState('');

  const { pins, addPin, editPin, removePin, refreshPhotoCounts } = usePins();

  // Load a pin's photos on demand and open the lightbox gallery.
  const openGallery = useCallback(async (pinId) => {
    try {
      const res = await fetch(`/api/pins/${pinId}/photos`);
      if (!res.ok) return;
      const photos = await res.json();
      if (photos.length) setGalleryPhotos(photos);
    } catch { /* ignore - gallery just will not open */ }
  }, []);

  function dismissOnboard() {
    localStorage.setItem('family-atlas-onboarded', '1');
    setShowOnboard(false);
  }

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
    setPrefillPlace('');
  }

  // Address search picked a place: fly the globe there and open Drop a Pin
  // pre-filled with the place name and coordinates.
  function handleAddressPick({ place, lat, lon }) {
    const coords = { lat, lon };
    setFocusCoords({ lat, lon, t: Date.now() }); // t forces a new object so repeat picks re-fly
    setPendingCoords(coords);
    setPrefillPlace(place);
    setDropModalOpen(true);
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
    <div style={{ minHeight: '100vh', background: 'transparent', color: theme.ink }}>

      {/* Header */}
      <header style={{ textAlign: 'center', padding: 'clamp(28px, 5vw, 52px) 16px 20px' }}>
        <div style={{ fontSize: 12, letterSpacing: 4, color: theme.inkSoft, fontFamily: theme.body, fontWeight: 900, textTransform: 'uppercase', marginBottom: 10 }}>
          A shared family record
        </div>
        <h1 style={{
          fontFamily: theme.display,
          fontSize: 'clamp(44px, 9vw, 92px)',
          fontWeight: 400, color: theme.red, margin: 0, letterSpacing: 3,
          textShadow: `3px 3px 0 ${theme.ink}`,
        }}>
          Family Atlas
        </h1>
        <p style={{ fontFamily: theme.body, fontWeight: 800, color: theme.inkSoft, fontSize: 'clamp(14px, 2.5vw, 18px)', marginTop: 8 }}>
          Where we live &amp; where we've wandered
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <div style={{ height: 3, width: 50, background: theme.ink, borderRadius: 2 }} />
          <div style={{ width: 9, height: 9, background: theme.yellow, border: theme.outline, transform: 'rotate(45deg)' }} />
          <div style={{ height: 3, width: 50, background: theme.ink, borderRadius: 2 }} />
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
              <div key={label} style={panel({ textAlign: 'center', padding: '12px 20px', minWidth: 84 })}>
                <div style={{ fontFamily: theme.display, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, color: theme.ink, lineHeight: 1, letterSpacing: 1 }}>{n}</div>
                <div style={{ fontFamily: theme.body, fontSize: 10, letterSpacing: 1.5, fontWeight: 900, color: theme.inkSoft, textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Controls bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={() => setDropModalOpen(true)}
            style={button(theme.red)}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '1px 1px 0 ' + theme.ink; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = theme.shadowSm; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = theme.shadowSm; }}
          >
            + Drop a Pin
          </button>

          {pins.length > 0 && (
            <div style={{ flex: '1 1 200px', maxWidth: 320, minWidth: 160 }}>
              <SearchBar pins={pins} onSelect={setSelectedPin} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {people.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontFamily: theme.body, fontSize: 11, fontWeight: 900, color: theme.inkSoft, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  Show
                </label>
                <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={{
                  background: theme.paper,
                  border: theme.outline,
                  borderRadius: theme.radiusSm, padding: '7px 11px',
                  fontSize: 13, fontFamily: theme.body, fontWeight: 800,
                  color: theme.ink, boxShadow: theme.shadowSm, cursor: 'pointer',
                }}>
                  <option value="all">Everyone</option>
                  {people.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
            <button onClick={onSignOut} title="Sign out" style={{
              ...button(theme.white),
              fontSize: 11, padding: '7px 13px', textTransform: 'uppercase', letterSpacing: 1,
            }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Address search */}
        <div style={{ maxWidth: 460, margin: '0 auto 12px' }}>
          <AddressSearch onPick={handleAddressPick} />
        </div>

        {/* Globe */}
        <WorldMap pins={visiblePins} onMapClick={handleMapClick} pendingCoords={pendingCoords} onPinClick={setSelectedPin} focusCoords={focusCoords} />

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap', fontFamily: theme.body, fontWeight: 800, color: theme.inkSoft, fontSize: 13 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.red, border: '2px solid ' + theme.ink, display: 'inline-block' }} /> Home
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.blue, border: '2px solid ' + theme.ink, display: 'inline-block' }} /> Travel
          </span>
          <span style={{ color: theme.inkFaint }}>Click globe or use button to drop a pin · scroll to zoom · drag to rotate</span>
        </div>

        {/* Pin list */}
        {visiblePins.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <h2 style={{ fontFamily: theme.display, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 400, color: theme.ink, margin: 0, letterSpacing: 1.5 }}>
                {filterPerson === 'all' ? 'All Pins' : `${filterPerson}'s Pins`}
              </h2>
              <span style={chip(theme.yellow, { letterSpacing: 0.5, textTransform: 'uppercase' })}>
                {visiblePins.length} {visiblePins.length === 1 ? 'entry' : 'entries'}
              </span>
              <div style={{ flex: 1, height: 3, background: theme.ink, borderRadius: 2 }} />
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {['list', 'timeline'].map(v => (
                  <button key={v} onClick={() => setLowerView(v)} style={{
                    fontFamily: theme.body, fontSize: 11, fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
                    padding: '6px 13px', borderRadius: theme.radiusSm,
                    border: theme.outline,
                    background: lowerView === v ? theme.yellow : theme.white,
                    color: theme.ink,
                    boxShadow: lowerView === v ? theme.shadowSm : 'none',
                  }}>
                    {v === 'list' ? 'List' : 'Timeline'}
                  </button>
                ))}
              </div>
            </div>

            {lowerView === 'timeline' ? (
              <TimelineView pins={visiblePins} onPinClick={setSelectedPin} />
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {visiblePins.map(pin => {
                const personColor = nameToColor(pin.name);
                const accent = pin.type === 'home' ? theme.red : theme.blue;
                return (
                  <div key={pin.id}
                    onClick={() => setSelectedPin(pin)}
                    style={panel({
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: theme.radiusSm, cursor: 'pointer',
                      borderLeft: `8px solid ${accent}`,
                      transition: 'transform 0.08s ease, box-shadow 0.08s ease',
                    })}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)'; e.currentTarget.style.boxShadow = theme.shadowLg; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = theme.shadow; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: personColor, border: theme.outline,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                      }}>
                        {pin.type === 'home' ? '🏠' : '✈'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: theme.body, fontSize: 15, fontWeight: 900, color: theme.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pin.name}
                        </div>
                        <div style={{ fontFamily: theme.body, fontSize: 13, fontWeight: 700, color: theme.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pin.place}
                        </div>
                        {pin.notes && (
                          <div style={{ fontFamily: theme.body, fontSize: 12, fontWeight: 600, color: theme.inkFaint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pin.notes}
                          </div>
                        )}
                      </div>
                      {pin.photo_count > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); openGallery(pin.id); }}
                          title="View photos"
                          style={chip(theme.yellow, { flexShrink: 0, cursor: 'pointer' })}>
                          📷 {pin.photo_count}
                        </button>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); removePin(pin.id); }} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: theme.inkFaint, fontSize: 22, lineHeight: 1, fontWeight: 900,
                      padding: '0 4px', flexShrink: 0, transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => e.target.style.color = theme.red}
                      onMouseLeave={e => e.target.style.color = theme.inkFaint}
                    >×</button>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}
      </main>

      {dropModalOpen && (
        <DropPinModal
          coords={pendingCoords}
          defaultName={name}
          defaultPlace={prefillPlace}
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

      {galleryPhotos && (
        <PhotoGallery photos={galleryPhotos} onClose={() => setGalleryPhotos(null)} />
      )}

      {showOnboard && <Onboarding onDismiss={dismissOnboard} />}

      <style>{`
        select option { background: ${theme.paper}; color: ${theme.ink}; }
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

  if (authed === null) return <div style={{ minHeight: '100vh', background: 'transparent' }} />;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Atlas onSignOut={signOut} />;
}
