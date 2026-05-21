import { useState, useRef } from 'react';
import { theme } from './theme';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Main-screen address/place search. Geocodes via Mapbox and, on pick, hands
// the chosen place name + coordinates up to the parent via onPick.
export default function AddressSearch({ onPick }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  function handleInput(val) {
    setQuery(val);
    clearTimeout(timer.current);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    setBusy(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${TOKEN}&autocomplete=true&limit=5`
        );
        const d = await r.json();
        setSuggestions(d.features || []);
      } catch {
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, 300);
  }

  function pick(feature) {
    onPick({
      place: feature.place_name,
      lat: Math.round(feature.center[1] * 100) / 100,
      lon: Math.round(feature.center[0] * 100) / 100,
    });
    setQuery('');
    setSuggestions([]);
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          placeholder="Find an address or place..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: theme.white, border: theme.outline,
            borderRadius: theme.radiusSm, boxShadow: theme.shadowSm,
            padding: '11px 12px 11px 38px',
            fontFamily: theme.body, fontWeight: 700, fontSize: 15, color: theme.ink,
          }}
        />
      </div>

      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
          background: theme.white, border: theme.outline, borderRadius: theme.radiusSm,
          boxShadow: theme.shadow, zIndex: 20, overflow: 'hidden',
        }}>
          {suggestions.map((f, i) => (
            <div
              key={f.id}
              onMouseDown={() => pick(f)}
              style={{
                padding: '10px 12px', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? `2px solid ${theme.ink}` : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.yellow}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontFamily: theme.body, fontSize: 14, fontWeight: 800, color: theme.ink }}>{f.text}</div>
              <div style={{ fontFamily: theme.body, fontSize: 11, fontWeight: 700, color: theme.inkSoft, marginTop: 2 }}>{f.place_name}</div>
            </div>
          ))}
        </div>
      )}

      {busy && query.trim().length >= 2 && suggestions.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6,
          fontFamily: theme.body, fontWeight: 700, fontSize: 12, color: theme.inkFaint,
        }}>
          Searching...
        </div>
      )}
    </div>
  );
}
