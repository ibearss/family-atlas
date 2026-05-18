import { useState, useRef } from 'react';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const iStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(212,168,67,0.2)',
  borderRadius: 8, padding: '9px 11px',
  fontSize: 13, fontFamily: 'Inter, sans-serif',
  color: '#f0e3c4', width: '100%', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 5,
  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
  color: 'rgba(212,168,67,0.55)', textTransform: 'uppercase', letterSpacing: 1.2,
};

export default function DropPinModal({ coords, defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName || '');
  const [place, setPlace] = useState('');
  const [pinType, setPinType] = useState('travel');
  const [notes, setNotes] = useState('');
  const [dropping, setDropping] = useState(false);
  const [localCoords, setLocalCoords] = useState(coords || null);
  const [suggestions, setSuggestions] = useState([]);
  const searchTimer = useRef(null);

  const canSubmit = name.trim() && place.trim() && localCoords && !dropping;

  function handlePlaceInput(val) {
    setPlace(val);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${TOKEN}&autocomplete=true&limit=5`
        );
        const d = await r.json();
        setSuggestions(d.features || []);
      } catch { setSuggestions([]); }
    }, 300);
  }

  function pickSuggestion(feature) {
    setPlace(feature.place_name);
    setLocalCoords({
      lat: Math.round(feature.center[1] * 100) / 100,
      lon: Math.round(feature.center[0] * 100) / 100,
    });
    setSuggestions([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setDropping(true);
    try {
      await onConfirm({
        name: name.trim(), place: place.trim(), notes: notes.trim(),
        type: pinType, lat: localCoords.lat, lon: localCoords.lon,
      });
    } finally {
      setDropping(false);
    }
  }

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: '#1a160f',
        border: '1px solid rgba(212,168,67,0.25)',
        borderRadius: 16,
        width: '92%', maxWidth: 420,
        padding: '24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
      }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontFamily: 'EB Garamond, serif', fontSize: 24, color: '#d4a843', margin: '0 0 4px', fontWeight: 700 }}>
            Drop a Pin
          </h2>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, letterSpacing: 0.5 }}>
            {localCoords
              ? <span style={{ color: 'rgba(240,227,196,0.3)' }}>{localCoords.lat}°, {localCoords.lon}°</span>
              : <span style={{ color: 'rgba(240,227,196,0.2)', fontStyle: 'italic' }}>Search for a place to set location</span>
            }
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={labelStyle}>
            Your Name
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Grandma Rose"
              style={iStyle}
              autoFocus
            />
          </label>

          <label style={labelStyle}>
            Place Name
            <div style={{ position: 'relative' }}>
              <input
                value={place}
                onChange={e => handlePlaceInput(e.target.value)}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                placeholder="Search for a place..."
                style={iStyle}
              />
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#1e1810', border: '1px solid rgba(212,168,67,0.3)',
                  borderTop: 'none', borderRadius: '0 0 8px 8px',
                  zIndex: 10, maxHeight: 220, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}>
                  {suggestions.map(f => (
                    <div
                      key={f.id}
                      onMouseDown={() => pickSuggestion(f)}
                      style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#f0e3c4' }}>{f.text}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(240,227,196,0.4)', marginTop: 2 }}>{f.place_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          <label style={labelStyle}>
            Type
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(212,168,67,0.25)' }}>
              {['home', 'travel'].map(t => (
                <button key={t} type="button" onClick={() => setPinType(t)} style={{
                  flex: 1, padding: '9px 14px', fontSize: 12, fontWeight: 600,
                  fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer',
                  background: pinType === t ? (t === 'home' ? '#a02828' : '#1a5c9a') : 'transparent',
                  color: pinType === t ? 'white' : 'rgba(240,227,196,0.45)',
                  transition: 'all 0.15s',
                }}>
                  {t === 'home' ? '🏠 Home' : '✈ Travel'}
                </button>
              ))}
            </div>
          </label>

          <label style={labelStyle}>
            Memory / Note <span style={{ color: 'rgba(240,227,196,0.25)', fontWeight: 400 }}>(optional)</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="'We got married here', 'Dad grew up two blocks away'..."
              rows={2}
              style={{ ...iStyle, resize: 'vertical', minHeight: 60, fontFamily: 'EB Garamond, serif', fontSize: 14, lineHeight: 1.5 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onCancel} style={{
              flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(240,227,196,0.5)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit} style={{
              flex: 2, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? 'linear-gradient(135deg, #c9a84c, #8b6030)' : 'rgba(255,255,255,0.07)',
              color: canSubmit ? '#13100d' : 'rgba(240,227,196,0.25)',
              transition: 'all 0.2s',
            }}>
              {dropping ? 'Dropping...' : 'Drop Pin'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(240,227,196,0.25); }
        input:focus, textarea:focus { outline: none; border-color: rgba(212,168,67,0.5) !important; }
      `}</style>
    </>
  );
}
