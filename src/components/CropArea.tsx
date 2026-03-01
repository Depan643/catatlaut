import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface CropAreaProps {
  imageSrc: string | null;
  imgRef: React.RefObject<HTMLImageElement>;
  onUpload: (offsetX: number, offsetY: number, scale: number) => void;
  uploading: boolean;
  onCancel: () => void;
}

const CONTAINER_SIZE = 280;

export const CropArea: React.FC<CropAreaProps> = ({ imageSrc, imgRef, onUpload, uploading, onCancel }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [baseScale, setBaseScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const touchState = useRef<{
    lastDist: number;
    lastCenter: { x: number; y: number };
    lastScale: number;
    dragging: boolean;
    lastPos: { x: number; y: number };
  }>({
    lastDist: 0,
    lastCenter: { x: 0, y: 0 },
    lastScale: 1,
    dragging: false,
    lastPos: { x: 0, y: 0 },
  });

  useEffect(() => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
    setImgLoaded(false);
  }, [imageSrc]);

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    // Scale so the image COVERS the circle completely
    const bs = CONTAINER_SIZE / Math.min(naturalWidth, naturalHeight);
    setBaseScale(bs);
    setScale(1);
    setImgLoaded(true);
  }, [imgRef]);

  const handleReset = useCallback(() => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
  }, []);

  // --- Pointer (mouse) drag ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    touchState.current.dragging = true;
    touchState.current.lastPos = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !touchState.current.dragging) return;
    const dx = e.clientX - touchState.current.lastPos.x;
    const dy = e.clientY - touchState.current.lastPos.y;
    touchState.current.lastPos = { x: e.clientX, y: e.clientY };
    setOffsetX(prev => prev + dx);
    setOffsetY(prev => prev + dy);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    touchState.current.dragging = false;
  }, []);

  // --- Touch: pinch-to-zoom + drag ---
  const getTouchDist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

  const getTouchCenter = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      touchState.current.lastDist = dist;
      touchState.current.lastCenter = center;
      touchState.current.lastScale = scale;
    } else if (e.touches.length === 1) {
      touchState.current.lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchState.current.dragging = true;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      const ratio = dist / touchState.current.lastDist;
      const newScale = Math.max(0.3, Math.min(8, touchState.current.lastScale * ratio));
      setScale(newScale);
      const dx = center.x - touchState.current.lastCenter.x;
      const dy = center.y - touchState.current.lastCenter.y;
      touchState.current.lastCenter = center;
      setOffsetX(prev => prev + dx);
      setOffsetY(prev => prev + dy);
    } else if (e.touches.length === 1 && touchState.current.dragging) {
      const dx = e.touches[0].clientX - touchState.current.lastPos.x;
      const dy = e.touches[0].clientY - touchState.current.lastPos.y;
      touchState.current.lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffsetX(prev => prev + dx);
      setOffsetY(prev => prev + dy);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) touchState.current.dragging = false;
    if (e.touches.length === 1) {
      touchState.current.lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchState.current.dragging = true;
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.max(0.3, Math.min(8, prev - e.deltaY * 0.003)));
  }, []);

  const totalScale = baseScale * scale;
  const imgW = imgRef.current ? imgRef.current.naturalWidth * totalScale : CONTAINER_SIZE;
  const imgH = imgRef.current ? imgRef.current.naturalHeight * totalScale : CONTAINER_SIZE;

  return (
    <div className="flex flex-col items-center gap-4">
      {imageSrc && (
        <>
          {/* Crop preview with overlay guides */}
          <div className="relative">
            <div
              ref={containerRef}
              className="rounded-full overflow-hidden border-4 border-primary/30 bg-muted relative cursor-grab active:cursor-grabbing shadow-xl ring-2 ring-primary/10"
              style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE, touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              <img
                ref={imgRef as any}
                src={imageSrc}
                alt="Preview"
                className="absolute select-none pointer-events-none"
                draggable={false}
                onLoad={handleImageLoad}
                style={{
                  width: imgW,
                  height: imgH,
                  left: (CONTAINER_SIZE - imgW) / 2 + offsetX,
                  top: (CONTAINER_SIZE - imgH) / 2 + offsetY,
                }}
              />
              {/* Center crosshair guides */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/30 rounded-full" />
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="w-full max-w-[280px] space-y-2">
            <div className="flex items-center gap-3">
              <button onClick={() => setScale(prev => Math.max(0.3, prev - 0.1))} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <ZoomOut className="w-4 h-4 text-muted-foreground" />
              </button>
              <Slider
                value={[scale * 100]}
                onValueChange={([v]) => setScale(v / 100)}
                min={30}
                max={800}
                step={5}
                className="flex-1"
              />
              <button onClick={() => setScale(prev => Math.min(8, prev + 0.1))} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom: {Math.round(scale * 100)}%</span>
              <button onClick={handleReset} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground text-center flex items-center gap-1.5">
        <Move className="w-3.5 h-3.5" /> Geser foto & scroll/cubit untuk zoom
      </p>
      <div className="flex gap-2 w-full max-w-[280px]">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button className="flex-1 gap-2" onClick={() => onUpload(offsetX, offsetY, scale)} disabled={uploading || !imgLoaded}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Gunakan Foto
        </Button>
      </div>
    </div>
  );
};
