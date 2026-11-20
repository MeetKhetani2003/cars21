'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Check, 
  Move, 
  RefreshCw, 
  ShieldCheck, 
  MapPin, 
  Sparkles,
  Eye,
  Sliders,
  Crop,
  X,
  CheckCircle2
} from 'lucide-react';

export interface VehicleCropResult {
  file: File;
  dataUrl: string;
  pan: { x: number; y: number };
  scale: number;
  rotation: number;
}

export interface VehicleImageAdjusterProps {
  imageUrl: string;
  originalFile?: File | null;
  carInfo?: {
    make?: string;
    model?: string;
    variant?: string;
    year?: number | string;
    price?: number | string;
    city?: string;
    fuel?: string;
    transmission?: string;
    badge?: string;
  };
  aspectRatio?: number; // default 16 / 10 = 1.6
  onApply?: (result: VehicleCropResult) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function VehicleImageAdjuster({
  imageUrl,
  originalFile,
  carInfo = {},
  aspectRatio = 1.6, // 16:10 standard Cars21 ratio
  onApply,
  onClose,
  isModal = false
}: VehicleImageAdjusterProps) {
  const [scale, setScale] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [appliedNotice, setAppliedNotice] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset when source image changes
  useEffect(() => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setAppliedNotice('');
  }, [imageUrl]);

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale(prev => Math.min(3.0, Math.max(0.7, Number((prev + zoomDelta).toFixed(2)))));
  };

  const handleReset = () => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = (deg: number) => {
    setRotation(prev => (prev + deg + 360) % 360);
  };

  // Export cropped canvas to high-res Blob and File
  const handleSaveCrop = useCallback(async () => {
    if (!imageUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for cropping'));
        img.src = imageUrl;
      });

      // Target high-resolution canvas size matching 16:10 (e.g. 1280x800)
      const targetWidth = 1280;
      const targetHeight = Math.round(targetWidth / aspectRatio); // 800px

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      // Fill neutral dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Measure current container dimensions to map pan/zoom accurately
      const container = containerRef.current;
      const containerWidth = container ? container.clientWidth : 480;
      const containerHeight = container ? container.clientHeight : 300;

      const scaleMultiplier = targetWidth / containerWidth;

      // Draw transformed image
      ctx.save();
      // Center canvas
      ctx.translate(targetWidth / 2, targetHeight / 2);

      // Apply pan (scaled to target canvas resolution)
      ctx.translate(pan.x * scaleMultiplier, pan.y * scaleMultiplier);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply scale
      ctx.scale(scale, scale);

      // Determine cover base dimensions
      const imgAspect = img.naturalWidth / img.naturalHeight;
      let drawW: number;
      let drawH: number;

      if (imgAspect > aspectRatio) {
        // Image is wider than container
        drawH = targetHeight;
        drawW = targetHeight * imgAspect;
      } else {
        // Image is taller than container
        drawW = targetWidth;
        drawH = targetWidth / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Export to high-quality JPEG blob
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      if (!blob) throw new Error('Could not generate cropped image blob');

      const fileName = originalFile ? originalFile.name.replace(/\.[^/.]+$/, '') + '-perfect.jpg' : 'car-view-perfect.jpg';
      const croppedFile = new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      setAppliedNotice('✓ Perfect view applied! Image updated successfully.');
      setTimeout(() => setAppliedNotice(''), 4000);

      if (onApply) {
        onApply({
          file: croppedFile,
          dataUrl: croppedDataUrl,
          pan,
          scale,
          rotation
        });
      }
    } catch (err: any) {
      console.warn('Canvas export note (likely external CORS URL):', err);
      // Fallback: still notify parent with pan and scale parameters
      if (onApply) {
        onApply({
          file: originalFile || new File([], 'car.jpg'),
          dataUrl: imageUrl,
          pan,
          scale,
          rotation
        });
      }
      setAppliedNotice('✓ Framing position adjusted.');
      setTimeout(() => setAppliedNotice(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, originalFile, aspectRatio, pan, scale, rotation, onApply]);

  const carMake = carInfo.make || 'Vehicle';
  const carModel = carInfo.model || 'Model';
  const carYear = carInfo.year || 2024;
  const carVariant = carInfo.variant || 'Standard Edition';
  const carPrice = carInfo.price ? (typeof carInfo.price === 'number' ? '₹' + Math.round(carInfo.price).toLocaleString('en-IN') : String(carInfo.price)) : '₹8,50,000';
  const carCity = carInfo.city || 'Junagadh';

  const content = (
    <div className="vehicle-image-adjuster-root" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header bar / Instructions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Crop size={14} /> Framing Studio &amp; Website Card Preview
          </span>
          <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            Adjust Vehicle Framing
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            Drag inside the preview to position the car. Use the zoom slider to eliminate cut-offs and set the perfect view.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #cbd5e1', background: '#ffffff', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#64748b' }}
            title="Close"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {appliedNotice && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> {appliedNotice}
        </div>
      )}

      {/* Main Studio: Two-Column Side-by-Side (Framer Canvas on Left, Live Website Card on Right) */}
      <div className="vehicle-adjuster-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Interactive Framing Stage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Move size={14} color="#2563eb" />
              <span>Interactive Drag Stage</span>
              <small style={{ color: '#64748b', fontWeight: 500 }}>(Click &amp; drag photo)</small>
            </span>
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: showGrid ? '#2563eb' : '#64748b',
                background: showGrid ? '#eff6ff' : '#f8fafc',
                border: showGrid ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer'
              }}
            >
              {showGrid ? 'Hide Alignment Grid' : 'Show Alignment Grid'}
            </button>
          </div>

          {/* Interactive Viewport */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/10',
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '2px solid #3b82f6'
            }}
          >
            {/* The Image undergoing real-time translation & scaling */}
            {imageUrl ? (
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Car framing target"
                draggable={false}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transformOrigin: 'center center',
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  pointerEvents: 'none'
                }}
              />
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8', fontSize: '13px' }}>
                No image selected
              </div>
            )}

            {/* Alignment Grid Overlay (Rule of Thirds) */}
            {showGrid && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
                <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
                <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
                <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
                <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
                <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)' }} />
                <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)' }} />
                <div />
              </div>
            )}

            {/* Floating Live Helper Pills */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
              <Move size={12} color="#60a5fa" />
              <span>Drag to Pan</span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span>{Math.round(scale * 100)}% Zoom</span>
            </div>

            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(37,99,235,0.9)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700, pointerEvents: 'none' }}>
              Standard 16:10 Frame
            </div>
          </div>

          {/* Controls: Zoom slider, Rotation, Reset */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ZoomIn size={14} /> Zoom Size:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '280px' }}>
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.max(0.7, Number((prev - 0.1).toFixed(2))))}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 800, color: '#475569' }}
                  title="Zoom Out"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.7"
                  max="2.5"
                  step="0.02"
                  value={scale}
                  onChange={e => setScale(parseFloat(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer', accentColor: '#2563eb' }}
                />
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.min(3.0, Number((prev + 0.1).toFixed(2))))}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 800, color: '#475569' }}
                  title="Zoom In"
                >
                  +
                </button>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', width: '38px', textAlign: 'right' }}>
                  {Math.round(scale * 100)}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleRotate(-90)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  title="Rotate Left 90°"
                >
                  <RotateCcw size={12} /> Rotate -90°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  title="Rotate Right 90°"
                >
                  <RotateCw size={12} /> Rotate +90°
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11.5px', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                title="Reset to Original Centering"
              >
                <RefreshCw size={12} /> Reset Framing
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Website Card Preview (Exact Replica of Cars21 Public Marketplace Card) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Eye size={14} /> Live Website Appearance
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Exact Marketplace Card View</span>
          </div>

          {/* Website Card Mockup */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Card Photo Window with Synchronized Live Framing */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/10',
                background: '#0f172a',
                overflow: 'hidden'
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Car Card Preview"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transformOrigin: 'center center',
                    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                />
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8' }}>
                  No photo selected
                </div>
              )}

              {/* Verified Badge Overlay */}
              <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                <span style={{ background: '#059669', color: '#ffffff', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> Cars21 Assured
                </span>
              </div>
            </div>

            {/* Card Body Info */}
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{carYear} · {carVariant}</span>
                <h4 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {carYear} {carMake} {carModel}
                </h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>Estimated Price</span>
                  <strong style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{carPrice}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                  <MapPin size={12} color="#2563eb" /> {carCity}
                </div>
              </div>
            </div>
          </div>

          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
            ✓ What you see above is exactly how buyers see this car across listing pages.
          </p>
        </div>
      </div>

      {/* Confirmation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '6px' }}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveCrop}
          disabled={isProcessing || !imageUrl}
          style={{
            padding: '9px 22px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 800,
            cursor: isProcessing || !imageUrl ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={16} />
          {isProcessing ? 'Processing High-Res Crop…' : 'Apply & Save Perfect View'}
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="vehicle-adjuster-modal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 9999,
          padding: '16px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '880px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
}
