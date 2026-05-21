import { useRef, useCallback, useEffect, useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { nameToColor } from './colors';
import { theme } from './theme';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Each pin gets a consistent character from its person's name so the same
// family member always looks the same. Known family names map to a gendered
// cast; everyone else gets a neutral character.
const GIRL_NAMES = new Set(['mom', 'janet', 'kira', 'marcelle']);
const BOY_NAMES = new Set(['scot', 'ian', 'aj']);
const GIRLS = ['👩', '👧', '👱‍♀️', '🙋‍♀️', '💃', '👩‍🦰', '👵'];
const BOYS = ['👨', '👦', '🧔', '👱‍♂️', '🙋‍♂️', '🕺', '👴'];
const PEOPLE = ['🧍', '🚶', '🧑', '🧒', '🙋', '🤷', '🧑‍🦰', '🧑‍🦱'];

function personEmoji(name) {
  const key = String(name || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash);
  if (GIRL_NAMES.has(key)) return GIRLS[h % GIRLS.length];
  if (BOY_NAMES.has(key)) return BOYS[h % BOYS.length];
  return PEOPLE[h % PEOPLE.length];
}

export default function WorldMap({ pins, onMapClick, pendingCoords, onPinClick, focusCoords }) {
  const mapRef = useRef();
  const wrapRef = useRef(null);
  const [hoveredPin, setHoveredPin] = useState(null);
  const [spinning, setSpinning] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const spinRef = useRef(null);
  const userInteracting = useRef(false);

  // Track viewport width to tune sizing and touch behavior on small screens.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
      return;
    }
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width ?? window.innerWidth;
      setIsMobile(w < 640);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-spin
  const spinGlobe = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !spinning || userInteracting.current) return;
    const z = map.getZoom();
    if (z < 3) {
      const center = map.getCenter();
      map.easeTo({ center: [center.lng - 0.4, center.lat], duration: 16, easing: n => n });
    }
  }, [spinning]);

  useEffect(() => {
    spinRef.current = setInterval(spinGlobe, 16);
    return () => clearInterval(spinRef.current);
  }, [spinGlobe]);

  // Safety net: never let the loading veil trap the user if onLoad is slow or
  // never fires (slow tiles, flaky network). Reveal the globe after 2s anyway.
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Fly the globe to a searched address. Stopping the spin first so the
  // camera does not fight the auto-rotation on the way in.
  useEffect(() => {
    if (!focusCoords) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    setSpinning(false);
    map.flyTo({ center: [focusCoords.lon, focusCoords.lat], zoom: 6, duration: 2200, essential: true });
  }, [focusCoords]);

  const handleMapClick = useCallback((e) => {
    onMapClick({
      lat: Math.round(e.lngLat.lat * 100) / 100,
      lon: Math.round(e.lngLat.lng * 100) / 100,
    });
  }, [onMapClick]);

  // Pin radius scales gently with zoom so a dense cluster declutters when
  // zoomed out and grows readable as you zoom in. Touch targets stay larger.
  const baseSize = isMobile ? 14 : 16;
  const pinSize = Math.round(Math.max(9, Math.min(baseSize, baseSize - (3 - zoom) * 2.2)));
  const charSize = pinSize + 9; // little-person emoji a touch bigger than the old dot
  const hitPad = isMobile ? 8 : 4;
  const mapHeight = isMobile ? 'min(70vh, 460px)' : 560;

  return (
    <div ref={wrapRef} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: theme.outlineThick, boxShadow: theme.shadowLg }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={{ longitude: 10, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: mapHeight }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        projection="globe"
        touchZoomRotate={true}
        touchPitch={false}
        dragRotate={!isMobile}
        fog={{
          range: [0.5, 10],
          color: '#242b4b',
          'horizon-blend': 0.08,
          'high-color': '#245bde',
          'space-color': '#0a0a1a',
          'star-intensity': 0.8,
        }}
        onClick={handleMapClick}
        onLoad={() => setLoaded(true)}
        onZoom={e => setZoom(e.viewState.zoom)}
        cursor="crosshair"
        onMouseDown={() => { userInteracting.current = true; }}
        onMouseUp={() => { userInteracting.current = false; }}
        onMoveEnd={() => { userInteracting.current = false; }}
        onTouchStart={() => { userInteracting.current = true; }}
        onTouchEnd={() => { userInteracting.current = false; }}
      >
        <NavigationControl position="top-left" showCompass={!isMobile} showZoom={true} />

        {/* Ghost pin for pending location */}
        {pendingCoords && (
          <Marker longitude={pendingCoords.lon} latitude={pendingCoords.lat} anchor="bottom">
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: theme.yellow,
              border: `3px dashed ${theme.ink}`,
              boxShadow: theme.shadowSm,
              animation: 'pulse 1.2s ease-in-out infinite',
            }} />
          </Marker>
        )}

        {/* Pins */}
        {pins.map(pin => {
          const active = hoveredPin?.id === pin.id;
          return (
            <Marker
              key={pin.id}
              longitude={pin.lon}
              latitude={pin.lat}
              anchor="center"
            >
              {/* Outer padding gives a larger touch/click target without growing the dot */}
              <div
                onMouseEnter={() => setHoveredPin(pin)}
                onMouseLeave={() => setHoveredPin(null)}
                onClick={e => { e.stopPropagation(); onPinClick?.(pin); }}
                style={{
                  padding: hitPad,
                  margin: -hitPad,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  zIndex: active ? 3 : 1,
                  animation: `bob 1.9s ease-in-out ${(pin.id % 12) * 0.12}s infinite`,
                }}>
                  <span style={{
                    fontSize: charSize, lineHeight: 1,
                    filter: 'drop-shadow(2px 2px 0 rgba(22,22,29,0.5))',
                    transform: active ? 'scale(1.45)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}>
                    {personEmoji(pin.name)}
                  </span>
                  {/* Colored base marks home vs travel */}
                  <span style={{
                    width: 9, height: 9, borderRadius: '50%', marginTop: -1,
                    background: pin.type === 'home' ? theme.red : theme.blue,
                    border: `2px solid ${theme.ink}`,
                    boxShadow: theme.shadowSm,
                  }} />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Tooltip popup */}
        {hoveredPin && (
          <Popup
            longitude={hoveredPin.lon}
            latitude={hoveredPin.lat}
            anchor="bottom"
            offset={24}
            closeButton={false}
            closeOnClick={false}
            style={{ zIndex: 10 }}
          >
            <div style={{ fontFamily: theme.body, lineHeight: 1.4, padding: '2px 4px' }}>
              <strong style={{ color: theme.ink, fontSize: 15, fontWeight: 900 }}>{hoveredPin.name}</strong>
              <span style={{ color: theme.inkSoft, fontWeight: 800 }}> - </span>
              <span style={{ fontSize: 14, color: theme.ink, fontWeight: 800 }}>{hoveredPin.place}</span>
              <div style={{ fontSize: 10, color: theme.inkSoft, fontFamily: theme.body, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>
                {hoveredPin.type}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Loading veil while the globe initializes */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, background: theme.paper,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            border: `4px solid ${theme.ink}`,
            borderTopColor: theme.red,
            animation: 'fa-spin 0.8s linear infinite',
          }} />
          <div style={{
            fontFamily: theme.display,
            fontSize: 26, color: theme.ink, letterSpacing: 1,
          }}>
            Charting the globe...
          </div>
        </div>
      )}

      {/* Spin toggle */}
      <button
        onClick={() => setSpinning(s => !s)}
        style={{
          position: 'absolute', top: 12, right: 14,
          background: theme.white, color: theme.ink,
          border: theme.outline, borderRadius: theme.radiusSm,
          padding: '6px 13px', fontSize: 12,
          fontFamily: theme.body, fontWeight: 900, cursor: 'pointer',
          boxShadow: theme.shadowSm, zIndex: 5,
        }}
      >
        {spinning ? '⏸ Stop Spin' : '▶ Auto Spin'}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        @keyframes fa-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .mapboxgl-popup-content {
          background: ${theme.paper} !important;
          border: ${theme.outline} !important;
          border-radius: 10px !important;
          box-shadow: ${theme.shadow} !important;
          padding: 10px 14px !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: ${theme.ink} !important;
        }
      `}</style>
    </div>
  );
}
