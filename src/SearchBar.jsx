import { useState, useEffect, useRef } from 'react';
import { nameToColor } from './colors';

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
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: 8, padding: '7px 11px',
          fontSize: 13, fontFamily: 'Inter, sans-serif',
          color: '#f0e3c4', width: '100%', boxSizing: 'border-box',
        }}
      />

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#1e1810', border: '1px solid rgba(212,168,67,0.3)',
          borderRadius: 8, zIndex: 50, maxHeight: 320, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `${personColor}22`, border: `2px solid ${personColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>
                  {pin.type === 'home' ? '🏠' : '✈'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'EB Garamond, serif', fontSize: 14, fontWeight: 600,
                    color: personColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {pin.name}
                  </div>
                  <div style={{
                    fontFamily: 'EB Garamond, serif', fontSize: 12, fontStyle: 'italic',
                    color: 'rgba(240,227,196,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
        input::placeholder { color: rgba(240,227,196,0.25); }
        input:focus { outline: none; border-color: rgba(212,168,67,0.5) !important; }
      `}</style>
    </div>
  );
}
