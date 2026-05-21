import { useState, useEffect, useCallback } from 'react';

export default function PhotoGallery({ photos, startIndex = 0, onClose }) {
  const count = photos ? photos.length : 0;
  const [index, setIndex] = useState(() => {
    if (!count) return 0;
    return Math.min(Math.max(startIndex, 0), count - 1);
  });

  const goPrev = useCallback(() => {
    setIndex(i => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setIndex(i => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goPrev, goNext]);

  if (!count) return null;

  const photo = photos[index];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(10,8,6,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <img
        src={`/uploads/${photo.filename}`}
        alt={photo.original_name}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '88vw', maxHeight: '86vh', objectFit: 'contain',
          borderRadius: 4, boxShadow: '0 8px 60px rgba(0,0,0,0.8)', cursor: 'default',
        }}
      />

      {/* Close */}
      <button
        onClick={onClose}
        title="Close"
        style={{
          position: 'fixed', top: 18, right: 22,
          background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
          fontSize: 28, cursor: 'pointer', borderRadius: 6, width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}
      >×</button>

      {count > 1 && (
        <>
          {/* Prev */}
          <button
            onClick={e => { e.stopPropagation(); goPrev(); }}
            title="Previous"
            style={{
              position: 'fixed', top: '50%', left: 18, transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              fontSize: 26, cursor: 'pointer', borderRadius: 6, width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >‹</button>

          {/* Next */}
          <button
            onClick={e => { e.stopPropagation(); goNext(); }}
            title="Next"
            style={{
              position: 'fixed', top: '50%', right: 18, transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              fontSize: 26, cursor: 'pointer', borderRadius: 6, width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >›</button>
        </>
      )}

      {/* Counter */}
      <div style={{
        position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: 1,
        color: 'rgba(240,227,196,0.7)', background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(212,168,67,0.2)', borderRadius: 14, padding: '5px 14px',
      }}>
        {index + 1} / {count}
      </div>
    </div>
  );
}
