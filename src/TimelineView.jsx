import { useMemo } from 'react';
import { nameToColor } from './colors';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// SQLite datetime strings look like "2026-05-18 14:01:33". Safari and some
// engines choke on the space form, so parse it manually into a real Date.
function parseCreatedAt(value) {
  if (!value) return null;
  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/
  );
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
  const date = new Date(
    Number(y), Number(mo) - 1, Number(d),
    Number(h), Number(mi), Number(s)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

// "May 2026" style key/label used for grouping headers.
function monthKey(date) {
  return date ? `${date.getFullYear()}-${date.getMonth()}` : 'unknown';
}

function monthLabel(date) {
  return date ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}` : 'Undated';
}

// A short, human date for the entry itself, e.g. "May 18, 2026".
function formatEntryDate(date) {
  if (!date) return 'Date unknown';
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function TimelineView({ pins, onPinClick }) {
  const groups = useMemo(() => {
    if (!pins || pins.length === 0) return [];

    const withDates = pins.map(pin => ({ pin, date: parseCreatedAt(pin.created_at) }));

    // Most recent first. Undated entries sink to the bottom.
    withDates.sort((a, b) => {
      const at = a.date ? a.date.getTime() : -Infinity;
      const bt = b.date ? b.date.getTime() : -Infinity;
      return bt - at;
    });

    const ordered = [];
    const byKey = new Map();
    for (const entry of withDates) {
      const key = monthKey(entry.date);
      if (!byKey.has(key)) {
        const group = { key, label: monthLabel(entry.date), entries: [] };
        byKey.set(key, group);
        ordered.push(group);
      }
      byKey.get(key).entries.push(entry);
    }
    return ordered;
  }, [pins]);

  if (!pins || pins.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 16px',
          fontFamily: 'EB Garamond, serif',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'rgba(240,227,196,0.4)',
        }}
      >
        No moments to chart yet. Drop a pin to begin the journey.
      </div>
    );
  }

  return (
    <section
      aria-label="Timeline of family pins"
      style={{ maxWidth: 640, margin: '0 auto', padding: '8px 0 24px' }}
    >
      {groups.map(group => (
        <div key={group.key}>
          {/* Month header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '26px 0 14px',
            }}
          >
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'rgba(212,168,67,0.55)',
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {group.label}
            </h3>
            <div style={{ flex: 1, height: 1, background: 'rgba(212,168,67,0.12)' }} />
          </div>

          {/* Entries with the connecting line */}
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
            {/* Vertical connecting line */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 16,
                top: 12,
                bottom: 12,
                width: 1,
                background: 'rgba(212,168,67,0.18)',
              }}
            />

            {group.entries.map(({ pin, date }) => {
              const personColor = nameToColor(pin.name);
              return (
                <li key={pin.id} style={{ position: 'relative', paddingLeft: 44, marginBottom: 10 }}>
                  {/* Node on the line */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 9,
                      top: 16,
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      background: '#13100d',
                      border: `2px solid ${personColor}`,
                      boxShadow: `0 0 0 3px ${personColor}22`,
                      zIndex: 1,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => onPinClick && onPinClick(pin)}
                    aria-label={`${pin.name} - ${pin.place}, ${formatEntryDate(date)}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${personColor}30`,
                      color: '#f0e3c4',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, lineHeight: 1 }}>
                        {pin.type === 'home' ? '🏠' : '✈'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'EB Garamond, serif',
                          fontSize: 16,
                          fontWeight: 600,
                          color: personColor,
                        }}
                      >
                        {pin.name}
                      </span>
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 10,
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          color: 'rgba(240,227,196,0.3)',
                          marginLeft: 'auto',
                        }}
                      >
                        {formatEntryDate(date)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: 'EB Garamond, serif',
                        fontSize: 14,
                        fontStyle: 'italic',
                        color: 'rgba(240,227,196,0.6)',
                        marginTop: 3,
                      }}
                    >
                      {pin.place}
                    </div>

                    {pin.notes && (
                      <div
                        style={{
                          fontFamily: 'EB Garamond, serif',
                          fontSize: 13,
                          color: 'rgba(240,227,196,0.4)',
                          marginTop: 5,
                          lineHeight: 1.45,
                        }}
                      >
                        {pin.notes}
                      </div>
                    )}

                    {pin.photo_count > 0 && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 8,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 10,
                          fontWeight: 600,
                          background: 'rgba(212,168,67,0.12)',
                          color: '#d4a843',
                          border: '1px solid rgba(212,168,67,0.25)',
                          borderRadius: 10,
                          padding: '2px 7px',
                        }}
                      >
                        📷 {pin.photo_count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
