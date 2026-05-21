import { useEffect } from 'react';

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
          width: '100%', maxWidth: 460,
          maxHeight: '88vh', overflowY: 'auto',
          background: 'linear-gradient(160deg, rgba(28,24,18,0.98), rgba(16,13,9,0.98))',
          border: '1px solid rgba(212,168,67,0.28)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          padding: 'clamp(24px, 5vw, 38px)',
          animation: 'fa-onb-rise 0.3s ease',
        }}
      >
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
          letterSpacing: 4, textTransform: 'uppercase',
          color: '#8b7040', marginBottom: 8, textAlign: 'center',
        }}>
          Welcome
        </div>
        <h2 style={{
          fontFamily: 'EB Garamond, serif', fontWeight: 700,
          fontSize: 'clamp(28px, 6vw, 40px)', color: '#d4a843',
          margin: 0, textAlign: 'center', letterSpacing: 1.5,
          textShadow: '0 2px 20px rgba(212,168,67,0.2)',
        }}>
          Family Atlas
        </h2>
        <p style={{
          fontFamily: 'EB Garamond, serif', fontStyle: 'italic',
          color: 'rgba(240,227,196,0.5)', fontSize: 15,
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
                background: 'rgba(212,168,67,0.1)',
                border: '1px solid rgba(212,168,67,0.3)',
              }}>
                {s.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'EB Garamond, serif', fontWeight: 600,
                  fontSize: 18, color: '#f0e3c4', lineHeight: 1.2,
                }}>
                  {s.title}
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 13,
                  color: 'rgba(240,227,196,0.55)', lineHeight: 1.5, marginTop: 3,
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
            marginTop: 28, width: '100%',
            padding: '13px 18px', borderRadius: 10,
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #c9a84c, #8b6030)',
            color: '#13100d', letterSpacing: 0.5,
            transition: 'opacity 0.15s',
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
