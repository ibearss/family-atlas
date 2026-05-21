import { useState, useEffect, useRef } from 'react';
import { nameToColor } from './colors';
import { theme, panel } from './theme';

const MAX_RESULTS = 8;

export default function SearchBar({ pins, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? (pins || [])
        .filter(p => {
          const haystack = [p.name, p.place, p.notes]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(trimmed);
        })
        .slice(0, MAX_RESULTS)
    : [];

  const showDropdown = open && matches.length > 0;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function pick(pin) {
    onSelect?.(pin);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 180 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search pins..."
        style={{
          background: theme.white,
          border: theme.outline,
          borderRadius: theme.radiusSm, padding: '7px 11px',
          fontSize: 13, fontFamily: theme.body, fontWeight: 800,
          color: theme.ink, width: '100%', boxSizing: 'border-box',
        }}
      />

      {showDropdown && (
        <div style={{
          ...panel(),
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
          zIndex: 50, maxHeight: 320, overflowY: 'auto',
          overflow: 'hidden',
        }}>
          {matches.map(pin => {
            const personColor = nameToColor(pin.name);
            return (
              <div
                key={pin.id}
                onMouseDown={() => pick(pin)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', cursor: 'pointer',
                  borderBottom: '2px solid ' + theme.ink,
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.yellow}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: pin.type === 'home' ? theme.red : theme.blue,
                  border: '2px solid ' + theme.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>
                  {pin.type === 'home' ? '🏠' : '✈'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: theme.body, fontSize: 14, fontWeight: 900,
                    color: personColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {pin.name}
                  </div>
                  <div style={{
                    fontFamily: theme.body, fontSize: 12, fontWeight: 700,
                    color: theme.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {pin.place}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        input::placeholder { color: rgba(22,22,29,0.4); }
        input:focus { outline: none; border-width: 3px !important; border-color: ${theme.blue} !important; }
      `}</style>
    </div>
  );
}
