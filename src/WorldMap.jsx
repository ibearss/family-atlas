import { useRef, useCallback, useEffect, useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { nameToColor } from './colors';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function WorldMap({ pins, onMapClick, pendingCoords, onPinClick }) {
  const mapRef = useRef();
  const [hoveredPin, setHoveredPin] = useState(null);
  const [spinning, setSpinning] = useState(true);
  const spinRef = useRef(null);
  const userInteracting = useRef(false);

  // Auto-spin
  const spinGlobe = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !spinning || userInteracting.current) return;
    const zoom = map.getZoom();
    if (zoom < 3) {
      const center = map.getCenter();
      map.easeTo({ center: [center.lng - 0.4, center.lat], duration: 16, easing: n => n });
    }
  }, [spinning]);

  useEffect(() => {
    spinRef.current = setInterval(spinGlobe, 16);
    return () => clearInterval(spinRef.current);
  }, [spinGlobe]);

  const handleMapClick = useCallback((e) => {
    onMapClick({
      lat: Math.round(e.lngLat.lat * 100) / 100,
      lon: Math.round(e.lngLat.lng * 100) / 100,
    });
  }, [onMapClick]);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={{ longitude: 10, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: 560 }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        projection="globe"
        fog={{
          range: [0.5, 10],
          color: '#242b4b',
          'horizon-blend': 0.08,
          'high-color': '#245bde',
          'space-color': '#0a0a1a',
          'star-intensity': 0.8,
        }}
        onClick={handleMapClick}
        cursor="crosshair"
        onMouseDown={() => { userInteracting.current = true; }}
        onMouseUp={() => { userInteracting.current = false; }}
        onMoveEnd={() => { userInteracting.current = false; }}
        onTouchStart={() => { userInteracting.current = true; }}
        onTouchEnd={() => { userInteracting.current = false; }}
        onRender={() => spinGlobe()}
      >
        <NavigationControl position="top-left" showCompass={true} showZoom={true} />

        {/* Ghost pin for pending location */}
        {pendingCoords && (
          <Marker longitude={pendingCoords.lon} latitude={pendingCoords.lat} anchor="bottom">
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(240,200,60,0.85)',
              border: '2px dashed white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              animation: 'pulse 1.2s ease-in-out infinite',
            }} />
          </Marker>
        )}

        {/* Pins */}
        {pins.map(pin => (
          <Marker
            key={pin.id}
            longitude={pin.lon}
            latitude={pin.lat}
            anchor="bottom"
          >
            <div
              onMouseEnter={() => setHoveredPin(pin)}
              onMouseLeave={() => setHoveredPin(null)}
              onClick={e => { e.stopPropagation(); onPinClick?.(pin); }}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                background: nameToColor(pin.name),
                border: '2.5px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                cursor: 'pointer',
                transition: 'transform 0.15s',
                transform: hoveredPin?.id === pin.id ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          </Marker>
        ))}

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
            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', lineHeight: 1.5, padding: '2px 4px' }}>
              <strong style={{ color: '#d4a843', fontSize: 15 }}>{hoveredPin.name}</strong>
              <span style={{ color: 'rgba(240,227,196,0.4)' }}> — </span>
              <span style={{ fontSize: 14, color: '#f0e3c4' }}>{hoveredPin.place}</span>
              <div style={{ fontSize: 10, color: 'rgba(240,227,196,0.4)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>
                {hoveredPin.type}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Spin toggle */}
      <button
        onClick={() => setSpinning(s => !s)}
        style={{
          position: 'absolute', top: 12, right: 14,
          background: 'rgba(0,0,0,0.6)', color: 'white',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
          padding: '5px 12px', fontSize: 12,
          fontFamily: 'Inter, sans-serif', cursor: 'pointer',
          backdropFilter: 'blur(4px)', zIndex: 5,
        }}
      >
        {spinning ? '⏸ Stop Spin' : '▶ Auto Spin'}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        .mapboxgl-popup-content {
          background: rgba(20,16,12,0.95) !important;
          border: 1px solid rgba(212,168,67,0.3) !important;
          border-radius: 8px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
          padding: 10px 14px !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: rgba(20,16,12,0.95) !important;
        }
      `}</style>
    </div>
  );
}
