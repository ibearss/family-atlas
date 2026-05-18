import { useState, useEffect, useRef, useCallback } from 'react';
import { nameToColor } from './colors';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const iStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(212,168,67,0.2)',
  borderRadius: 8, padding: '9px 11px',
  fontSize: 13, fontFamily: 'Inter, sans-serif',
  color: '#f0e3c4', width: '100%', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 5,
  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
  color: 'rgba(212,168,67,0.55)', textTransform: 'uppercase', letterSpacing: 1.2,
};

export default function PinModal({ pin, onClose, onPhotoChange, onDelete, onEdit }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(pin.name);
  const [editPlace, setEditPlace] = useState(pin.place);
  const [editType, setEditType] = useState(pin.type);
  const [editNotes, setEditNotes] = useState(pin.notes);
  const [editCoords, setEditCoords] = useState({ lat: pin.lat, lon: pin.lon });
  const [editSuggestions, setEditSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    fetch(`/api/pins/${pin.id}/photos`)
      .then(r => r.json())
      .then(setPhotos)
      .catch(console.error);
  }, [pin.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') lightbox ? setLightbox(null) : onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, lightbox]);

  function startEditing() {
    setEditName(pin.name);
    setEditPlace(pin.place);
    setEditType(pin.type);
    setEditNotes(pin.notes);
    setEditCoords({ lat: pin.lat, lon: pin.lon });
    setEditSuggestions([]);
    setIsEditing(true);
  }

  function cancelEditing() {
    setEditSuggestions([]);
    setIsEditing(false);
  }

  function handleEditPlaceInput(val) {
    setEditPlace(val);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setEditSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${TOKEN}&autocomplete=true&limit=5`
        );
        const d = await r.json();
        setEditSuggestions(d.features || []);
      } catch { setEditSuggestions([]); }
    }, 300);
  }

  function pickEditSuggestion(feature) {
    setEditPlace(feature.place_name);
    setEditCoords({
      lat: Math.round(feature.center[1] * 100) / 100,
      lon: Math.round(feature.center[0] * 100) / 100,
    });
    setEditSuggestions([]);
  }

  async function handleEditSave() {
    if (!editName.trim() || !editPlace.trim() || saving) return;
    setSaving(true);
    try {
      await onEdit(pin.id, {
        name: editName.trim(), place: editPlace.trim(),
        type: editType, notes: editNotes.trim(),
        lat: editCoords.lat, lon: editCoords.lon,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

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

  async function handleDeletePhoto(photoId) {
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
  const canSave = editName.trim() && editPlace.trim() && !saving;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} />

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
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: 'EB Garamond, serif', fontSize: 16, color: '#d4a843', fontWeight: 600 }}>Edit Pin</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={cancelEditing} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(240,227,196,0.5)', cursor: 'pointer',
                  }}>Cancel</button>
                  <button onClick={handleEditSave} disabled={!canSave} style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    fontFamily: 'Inter, sans-serif', border: 'none',
                    cursor: canSave ? 'pointer' : 'not-allowed',
                    background: canSave ? 'linear-gradient(135deg, #c9a84c, #8b6030)' : 'rgba(255,255,255,0.07)',
                    color: canSave ? '#13100d' : 'rgba(240,227,196,0.25)',
                    transition: 'all 0.2s',
                  }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <label style={labelStyle}>
                Name
                <input value={editName} onChange={e => setEditName(e.target.value)} style={iStyle} autoFocus />
              </label>

              <label style={labelStyle}>
                Place
                <div style={{ position: 'relative' }}>
                  <input
                    value={editPlace}
                    onChange={e => handleEditPlaceInput(e.target.value)}
                    onBlur={() => setTimeout(() => setEditSuggestions([]), 150)}
                    style={iStyle}
                    placeholder="Search to update location..."
                  />
                  {editSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#1e1810', border: '1px solid rgba(212,168,67,0.3)',
                      borderTop: 'none', borderRadius: '0 0 8px 8px',
                      zIndex: 10, maxHeight: 180, overflowY: 'auto',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    }}>
                      {editSuggestions.map(f => (
                        <div
                          key={f.id}
                          onMouseDown={() => pickEditSuggestion(f)}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#f0e3c4' }}>{f.text}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(240,227,196,0.4)', marginTop: 2 }}>{f.place_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(240,227,196,0.2)', marginTop: 2 }}>
                  {editCoords.lat}°, {editCoords.lon}° — select from suggestions to update location
                </div>
              </label>

              <label style={labelStyle}>
                Type
                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(212,168,67,0.25)' }}>
                  {['home', 'travel'].map(t => (
                    <button key={t} type="button" onClick={() => setEditType(t)} style={{
                      flex: 1, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                      fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer',
                      background: editType === t ? (t === 'home' ? '#a02828' : '#1a5c9a') : 'transparent',
                      color: editType === t ? 'white' : 'rgba(240,227,196,0.45)',
                      transition: 'all 0.15s',
                    }}>
                      {t === 'home' ? '🏠 Home' : '✈ Travel'}
                    </button>
                  ))}
                </div>
              </label>

              <label style={labelStyle}>
                Note
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={2}
                  style={{ ...iStyle, resize: 'vertical', fontFamily: 'EB Garamond, serif', fontSize: 14, lineHeight: 1.5 }}
                />
              </label>
            </div>
          ) : (
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

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <button onClick={onClose} style={{
                  background: 'none', border: 'none', color: 'rgba(240,227,196,0.3)',
                  cursor: 'pointer', fontSize: 26, lineHeight: 1, padding: 4,
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.target.style.color = '#f0e3c4'}
                  onMouseLeave={e => e.target.style.color = 'rgba(240,227,196,0.3)'}
                >×</button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onEdit && (
                    <button onClick={startEditing} style={{
                      background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)',
                      color: 'rgba(212,168,67,0.6)', cursor: 'pointer',
                      borderRadius: 6, padding: '4px 10px',
                      fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                      letterSpacing: 0.5, transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.18)'; e.currentTarget.style.color = '#d4a843'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.08)'; e.currentTarget.style.color = 'rgba(212,168,67,0.6)'; }}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(pin.id)} style={{
                      background: 'rgba(200,50,50,0.1)', border: '1px solid rgba(200,50,50,0.3)',
                      color: 'rgba(220,80,80,0.7)', cursor: 'pointer',
                      borderRadius: 6, padding: '4px 10px',
                      fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                      letterSpacing: 0.5, transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,50,50,0.25)'; e.currentTarget.style.color = '#e05050'; e.currentTarget.style.borderColor = 'rgba(200,50,50,0.6)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,50,50,0.1)'; e.currentTarget.style.color = 'rgba(220,80,80,0.7)'; e.currentTarget.style.borderColor = 'rgba(200,50,50,0.3)'; }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body — photos */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 24px', flex: 1 }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragging ? pinColor : 'rgba(212,168,67,0.25)'}`,
              borderRadius: 10, padding: '18px', textAlign: 'center', cursor: 'pointer',
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
                    onClick={e => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1, padding: 0, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,50,50,0.9)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.75)'}
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

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(240,227,196,0.25); }
        input:focus, textarea:focus { outline: none; border-color: rgba(212,168,67,0.5) !important; }
      `}</style>
    </>
  );
}
