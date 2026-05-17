import { useState, useEffect, useRef, useCallback } from 'react';
import { nameToColor } from './colors';

export default function PinModal({ pin, onClose, onPhotoChange }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fetch(`/api/pins/${pin.id}/photos`)
      .then(r => r.json())
      .then(setPhotos)
      .catch(console.error);
  }, [pin.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') lightbox ? setLightbox(null) : onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, lightbox]);

  const uploadFiles = useCallback(async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('photos', f);
      const res = await fetch(`/api/pins/${pin.id}/photos`, { method: 'POST', body: fd });
      const saved = await res.json();
      setPhotos(prev => [...prev, ...saved]);
      onPhotoChange?.(pin.id);
    } finally {
      setUploading(false);
    }
  }, [pin.id, onPhotoChange]);

  async function handleFileChange(e) {
    await uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  async function handleDelete(photoId) {
    await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    onPhotoChange?.(pin.id);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    uploadFiles(files);
  }

  const pinColor = nameToColor(pin.name);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: '#1a160f',
        border: `1px solid ${pinColor}33`,
        borderRadius: 16,
        width: '92%', maxWidth: 660,
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px ${pinColor}22`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: `${pinColor}20`, border: `2px solid ${pinColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>
                {pin.type === 'home' ? '🏠' : '✈'}
              </div>
              <div>
                <h2 style={{ fontFamily: 'EB Garamond, serif', fontSize: 24, fontWeight: 700, color: '#d4a843', margin: 0, lineHeight: 1.2 }}>
                  {pin.name}
                </h2>
                <p style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: 'rgba(240,227,196,0.65)', fontSize: 16, margin: '3px 0 0' }}>
                  {pin.place}
                </p>
                {pin.notes && (
                  <p style={{ fontFamily: 'EB Garamond, serif', fontSize: 15, color: 'rgba(240,227,196,0.55)', margin: '6px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{pin.notes}"
                  </p>
                )}
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(240,227,196,0.22)', margin: '6px 0 0', letterSpacing: 0.5 }}>
                  {pin.lat}° {pin.lat >= 0 ? 'N' : 'S'}, {Math.abs(pin.lon)}° {pin.lon >= 0 ? 'E' : 'W'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'rgba(240,227,196,0.3)',
              cursor: 'pointer', fontSize: 26, lineHeight: 1, padding: 4, flexShrink: 0,
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.target.style.color = '#f0e3c4'}
              onMouseLeave={e => e.target.style.color = 'rgba(240,227,196,0.3)'}
            >×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 24px', flex: 1 }}>

          {/* Drop zone / upload */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragging ? pinColor : 'rgba(212,168,67,0.25)'}`,
              borderRadius: 10,
              padding: '18px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: photos.length ? 16 : 0,
              background: dragging ? `${pinColor}10` : 'rgba(255,255,255,0.02)',
              transition: 'all 0.15s',
            }}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? '⏳' : '📷'}</div>
            <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 16, color: uploading ? '#d4a843' : 'rgba(240,227,196,0.5)' }}>
              {uploading ? 'Uploading...' : 'Drop photos here or click to browse'}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(240,227,196,0.25)', marginTop: 4 }}>
              JPG, PNG, HEIC · up to 20 MB each
            </div>
          </div>

          {/* Photo grid */}
          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {photos.map(photo => (
                <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3', background: '#0d0b07', cursor: 'zoom-in' }}
                  onClick={() => setLightbox(photo)}>
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.original_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1, padding: 0,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,50,50,0.9)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.75)'}
                    title="Remove photo"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {photos.length === 0 && !uploading && (
            <p style={{ textAlign: 'center', fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: 'rgba(240,227,196,0.2)', fontSize: 15, marginTop: 12 }}>
              No photos yet — add the first one above
            </p>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <img
            src={`/uploads/${lightbox.filename}`}
            alt={lightbox.original_name}
            style={{ maxWidth: '92vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 4, boxShadow: '0 8px 60px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', top: 18, right: 22, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer', borderRadius: 6, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
      )}
    </>
  );
}
