import { useState, useRef } from 'react';
import { theme, panel, button } from './theme';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const iStyle = {
  background: theme.white,
  border: theme.outline,
  borderRadius: theme.radiusSm, padding: '9px 11px',
  fontSize: 14, fontFamily: theme.body, fontWeight: 700,
  color: theme.ink, width: '100%', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 5,
  fontFamily: theme.body, fontSize: 11, fontWeight: 900,
  color: theme.ink, textTransform: 'uppercase', letterSpacing: 1,
};

export default function DropPinModal({ coords, defaultName, defaultPlace, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName || '');
  const [place, setPlace] = useState(defaultPlace || '');
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
        ...panel(),
        borderRadius: 16,
        width: '92%', maxWidth: 420,
        padding: '24px',
        boxShadow: theme.shadowLg,
      }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontFamily: theme.display, fontSize: 32, color: theme.ink, margin: '0 0 4px', letterSpacing: 0.5 }}>
            Drop a Pin
          </h2>
          <div style={{ fontFamily: theme.body, fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>
            {localCoords
              ? <span style={{ color: theme.inkSoft }}>{localCoords.lat}°, {localCoords.lon}°</span>
              : <span style={{ color: theme.inkFaint }}>Search for a place to set location</span>
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
                  background: theme.white, border: theme.outline,
                  borderTop: 'none', borderRadius: '0 0 10px 10px',
                  zIndex: 10, maxHeight: 220, overflowY: 'auto',
                  boxShadow: theme.shadowSm,
                }}>
                  {suggestions.map(f => (
                    <div
                      key={f.id}
                      onMouseDown={() => pickSuggestion(f)}
                      style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: `2px solid ${theme.ink}` }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.yellow}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontFamily: theme.body, fontSize: 13, fontWeight: 800, color: theme.ink }}>{f.text}</div>
                      <div style={{ fontFamily: theme.body, fontSize: 11, fontWeight: 700, color: theme.inkSoft, marginTop: 2 }}>{f.place_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          <label style={labelStyle}>
            Type
            <div style={{ display: 'flex', borderRadius: theme.radiusSm, overflow: 'hidden', border: theme.outline }}>
              {['home', 'travel'].map(t => (
                <button key={t} type="button" onClick={() => setPinType(t)} style={{
                  flex: 1, padding: '9px 14px', fontSize: 13, fontWeight: 900,
                  fontFamily: theme.body, border: 'none', cursor: 'pointer',
                  borderRight: t === 'home' ? `3px solid ${theme.ink}` : 'none',
                  background: pinType === t ? (t === 'home' ? theme.red : theme.blue) : theme.white,
                  color: pinType === t ? theme.white : theme.inkSoft,
                  transition: 'all 0.15s',
                }}>
                  {t === 'home' ? '🏠 Home' : '✈ Travel'}
                </button>
              ))}
            </div>
          </label>

          <label style={labelStyle}>
            Memory / Note <span style={{ color: theme.inkFaint, fontWeight: 700 }}>(optional)</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="'We got married here', 'Dad grew up two blocks away'..."
              rows={2}
              style={{ ...iStyle, resize: 'vertical', minHeight: 60, fontSize: 14, lineHeight: 1.5 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onCancel} style={{
              ...button(theme.white), flex: 1, padding: '11px', fontSize: 14,
            }}>
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit} style={{
              ...button(canSubmit ? theme.red : theme.white), flex: 2, padding: '11px', fontSize: 14,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              color: canSubmit ? theme.white : theme.inkFaint,
            }}>
              {dropping ? 'Dropping...' : 'Drop Pin'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: ${theme.inkFaint}; }
        input:focus, textarea:focus { outline: none; border-color: ${theme.blue} !important; }
      `}</style>
    </>
  );
}
