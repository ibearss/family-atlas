import { useMemo } from 'react';
import { nameToColor } from './colors';
import { theme, panel, chip } from './theme';

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
          fontFamily: theme.body,
          fontWeight: 800,
          fontSize: 16,
          color: theme.inkSoft,
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
                fontFamily: theme.display,
                fontSize: 22,
                letterSpacing: 0.5,
                color: theme.ink,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {group.label}
            </h3>
            <div style={{ flex: 1, height: 3, background: theme.ink, borderRadius: 2 }} />
          </div>

          {/* Entries with the connecting line */}
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
            {/* Vertical connecting line */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 15,
                top: 12,
                bottom: 12,
                width: 3,
                background: theme.ink,
                borderRadius: 2,
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
                      left: 8,
                      top: 16,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: personColor,
                      border: `3px solid ${theme.ink}`,
                      boxShadow: theme.shadowSm,
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
                      ...panel(),
                      color: theme.ink,
                      transition: 'transform 0.08s ease, box-shadow 0.08s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = theme.shadowLg; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = theme.shadow; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, lineHeight: 1 }}>
                        {pin.type === 'home' ? '🏠' : '✈'}
                      </span>
                      <span
                        style={{
                          fontFamily: theme.body,
                          fontSize: 17,
                          fontWeight: 900,
                          color: theme.ink,
                        }}
                      >
                        {pin.name}
                      </span>
                      <span
                        style={{
                          ...chip(personColor),
                          marginLeft: 'auto',
                        }}
                      >
                        {formatEntryDate(date)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: theme.body,
                        fontSize: 14,
                        fontWeight: 800,
                        color: theme.ink,
                        marginTop: 3,
                      }}
                    >
                      {pin.place}
                    </div>

                    {pin.notes && (
                      <div
                        style={{
                          fontFamily: theme.body,
                          fontSize: 13,
                          fontWeight: 700,
                          color: theme.inkSoft,
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
                          ...chip(theme.yellow),
                          display: 'inline-block',
                          marginTop: 8,
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
