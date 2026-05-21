import { useState, useEffect, useRef, useCallback } from 'react';
import { nameToColor } from './colors';
import { theme, panel, button, chip } from './theme';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const iStyle = {
  background: theme.white,
  border: theme.outline,
  borderRadius: theme.radiusSm, padding: '9px 11px',
  fontSize: 14, fontFamily: theme.body, fontWeight: 700,
  color: theme.ink, width: '100%', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 5,
  fontFamily: theme.body, fontSize: 11, fontWeight: 900,
  color: theme.ink, textTransform: 'uppercase', letterSpacing: 1,
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
        ...panel(),
        borderRadius: 16,
        width: '92%', maxWidth: 660,
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: theme.shadowLg,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: `3px solid ${theme.ink}`, flexShrink: 0 }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: theme.display, fontSize: 24, color: theme.ink, letterSpacing: 0.5 }}>Edit Pin</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={cancelEditing} style={{
                    ...button(theme.white), fontSize: 12, padding: '6px 14px',
                  }}>Cancel</button>
                  <button onClick={handleEditSave} disabled={!canSave} style={{
                    ...button(canSave ? theme.blue : theme.white), fontSize: 12, padding: '6px 14px',
                    cursor: canSave ? 'pointer' : 'not-allowed',
                    color: canSave ? theme.white : theme.inkFaint,
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
                      background: theme.white, border: theme.outline,
                      borderTop: 'none', borderRadius: '0 0 10px 10px',
                      zIndex: 10, maxHeight: 180, overflowY: 'auto',
                      boxShadow: theme.shadowSm,
                    }}>
                      {editSuggestions.map(f => (
                        <div
                          key={f.id}
                          onMouseDown={() => pickEditSuggestion(f)}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: `2px solid ${theme.ink}` }}
                          onMouseEnter={e => e.currentTarget.style.background = theme.yellow}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ fontFamily: theme.body, fontSize: 13, fontWeight: 800, color: theme.ink }}>{f.text}</div>
                          <div style={{ fontFamily: theme.body, fontSize: 11, fontWeight: 700, color: theme.inkSoft, marginTop: 2 }}>{f.place_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: theme.body, fontSize: 11, fontWeight: 700, color: theme.inkSoft, marginTop: 2 }}>
                  {editCoords.lat}°, {editCoords.lon}° - select from suggestions to update location
                </div>
              </label>

              <label style={labelStyle}>
                Type
                <div style={{ display: 'flex', borderRadius: theme.radiusSm, overflow: 'hidden', border: theme.outline }}>
                  {['home', 'travel'].map(t => (
                    <button key={t} type="button" onClick={() => setEditType(t)} style={{
                      flex: 1, padding: '8px 14px', fontSize: 13, fontWeight: 900,
                      fontFamily: theme.body, border: 'none', cursor: 'pointer',
                      borderRight: t === 'home' ? `3px solid ${theme.ink}` : 'none',
                      background: editType === t ? (t === 'home' ? theme.red : theme.blue) : theme.white,
                      color: editType === t ? theme.white : theme.inkSoft,
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
                  style={{ ...iStyle, resize: 'vertical', fontSize: 14, lineHeight: 1.5 }}
                />
              </label>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: pinColor, border: theme.outline,
                  boxShadow: theme.shadowSm,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                }}>
                  {pin.type === 'home' ? '🏠' : '✈'}
                </div>
                <div>
                  <h2 style={{ fontFamily: theme.display, fontSize: 30, color: theme.ink, margin: 0, lineHeight: 1.1, letterSpacing: 0.5 }}>
                    {pin.name}
                  </h2>
                  <p style={{ fontFamily: theme.body, fontWeight: 800, color: theme.ink, fontSize: 16, margin: '3px 0 0' }}>
                    {pin.place}
                  </p>
                  {pin.notes && (
                    <p style={{ fontFamily: theme.body, fontWeight: 700, fontSize: 15, color: theme.inkSoft, margin: '6px 0 0', lineHeight: 1.5 }}>
                      "{pin.notes}"
                    </p>
                  )}
                  <p style={{ fontFamily: theme.body, fontWeight: 800, fontSize: 11, color: theme.inkFaint, margin: '6px 0 0', letterSpacing: 0.5 }}>
                    {pin.lat}° {pin.lat >= 0 ? 'N' : 'S'}, {Math.abs(pin.lon)}° {pin.lon >= 0 ? 'E' : 'W'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <button onClick={onClose} style={{
                  background: theme.white, border: theme.outline, color: theme.ink,
                  cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '2px 9px',
                  borderRadius: theme.radiusSm, boxShadow: theme.shadowSm,
                  fontFamily: theme.body, fontWeight: 900,
                }}
                >×</button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onEdit && (
                    <button onClick={startEditing} style={{
                      ...button(theme.yellow), fontSize: 12, padding: '5px 12px',
                    }}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(pin.id)} style={{
                      ...button(theme.red), color: theme.white, fontSize: 12, padding: '5px 12px',
                    }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body - photos */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 24px', flex: 1 }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border: `3px dashed ${dragging ? theme.blue : theme.ink}`,
              borderRadius: theme.radiusSm, padding: '18px', textAlign: 'center', cursor: 'pointer',
              marginBottom: photos.length ? 16 : 0,
              background: dragging ? theme.yellow : theme.white,
              transition: 'all 0.15s',
            }}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? '⏳' : '📷'}</div>
            <div style={{ fontFamily: theme.body, fontWeight: 900, fontSize: 16, color: uploading ? theme.blue : theme.ink }}>
              {uploading ? 'Uploading...' : 'Drop photos here or click to browse'}
            </div>
            <div style={{ fontFamily: theme.body, fontWeight: 700, fontSize: 11, color: theme.inkSoft, marginTop: 4 }}>
              JPG, PNG, HEIC · up to 20 MB each
            </div>
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {photos.map(photo => (
                <div key={photo.id} style={{ position: 'relative', borderRadius: theme.radiusSm, overflow: 'hidden', aspectRatio: '4/3', background: theme.white, border: theme.outline, boxShadow: theme.shadowSm, cursor: 'zoom-in' }}
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
                      width: 24, height: 24, borderRadius: '50%',
                      background: theme.red, border: theme.outline,
                      color: theme.white, cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1, padding: 0, fontFamily: theme.body, fontWeight: 900,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {photos.length === 0 && !uploading && (
            <p style={{ textAlign: 'center', fontFamily: theme.body, fontWeight: 800, color: theme.inkSoft, fontSize: 15, marginTop: 12 }}>
              No photos yet - add the first one above
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
            style={{ maxWidth: '92vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: theme.radiusSm, border: theme.outlineThick, boxShadow: theme.shadowLg }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', top: 18, right: 22, background: theme.red, border: theme.outline, color: theme.white, fontSize: 24, cursor: 'pointer', borderRadius: theme.radiusSm, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.body, fontWeight: 900, boxShadow: theme.shadowSm }}
          >×</button>
        </div>
      )}

      <style>{`
        input::placeholder, textarea::placeholder { color: ${theme.inkFaint}; }
        input:focus, textarea:focus { outline: none; border-color: ${theme.blue} !important; }
      `}</style>
    </>
  );
}
