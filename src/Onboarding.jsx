import { useEffect } from 'react';
import { theme, panel, button } from './theme';

const STEPS = [
  {
    icon: '📍',
    title: 'Drop a pin',
    body: 'Click anywhere on the globe, or tap the "+ Drop a Pin" button to mark a place that matters.',
  },
  {
    icon: '🏠',
    title: 'Home or travel',
    body: 'Tag each pin as a home 🏠 where someone lives, or a trip ✈ to somewhere you wandered.',
  },
  {
    icon: '📷',
    title: 'Add photos',
    body: 'Open any pin to attach photos and notes, building a small story for every place.',
  },
  {
    icon: '👤',
    title: 'Filter by person',
    body: 'Use the "Show" menu to focus the map on one traveler, or see everyone at once.',
  },
];

export default function Onboarding({ onDismiss }) {
  // Allow Escape to dismiss, and lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDismiss?.(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(8,6,4,0.78)',
        backdropFilter: 'blur(6px)',
        animation: 'fa-onb-fade 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...panel(),
          width: '100%', maxWidth: 460,
          maxHeight: '88vh', overflowY: 'auto',
          boxShadow: theme.shadowLg,
          padding: 'clamp(24px, 5vw, 38px)',
          animation: 'fa-onb-rise 0.3s ease',
        }}
      >
        <div style={{
          fontFamily: theme.body, fontSize: 11, fontWeight: 800,
          letterSpacing: 4, textTransform: 'uppercase',
          color: theme.inkSoft, marginBottom: 8, textAlign: 'center',
        }}>
          Welcome
        </div>
        <h2 style={{
          fontFamily: theme.display, fontWeight: 400,
          fontSize: 'clamp(34px, 8vw, 50px)', color: theme.blue,
          margin: 0, textAlign: 'center', letterSpacing: 1,
          textShadow: '3px 3px 0 ' + theme.ink,
        }}>
          Family Atlas
        </h2>
        <p style={{
          fontFamily: theme.body, fontWeight: 800,
          color: theme.inkSoft, fontSize: 15,
          textAlign: 'center', margin: '6px 0 24px',
        }}>
          A few steps to start mapping your family.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                flexShrink: 0,
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                background: theme.yellow,
                border: theme.outline, boxShadow: theme.shadowSm,
              }}>
                {s.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: theme.display, fontWeight: 400,
                  fontSize: 22, color: theme.ink, lineHeight: 1.2, letterSpacing: 0.5,
                }}>
                  {s.title}
                </div>
                <div style={{
                  fontFamily: theme.body, fontWeight: 700, fontSize: 13,
                  color: theme.inkSoft, lineHeight: 1.5, marginTop: 3,
                }}>
                  {s.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          style={{
            ...button(theme.red),
            marginTop: 28, width: '100%',
            padding: '13px 18px', fontSize: 16,
            color: theme.white,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Got it
        </button>
      </div>

      <style>{`
        @keyframes fa-onb-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fa-onb-rise {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
