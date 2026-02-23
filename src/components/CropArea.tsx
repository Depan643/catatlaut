import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Move } from 'lucide-react';

interface CropAreaProps {
  imageSrc: string | null;
  imgRef: React.RefObject<HTMLImageElement>;
  onUpload: (offsetX: number, offsetY: number, scale: number) => void;
  uploading: boolean;
  onCancel: () => void;
}

const CONTAINER_SIZE = 256;

export const CropArea: React.FC<CropAreaProps> = ({ imageSrc, imgRef, onUpload, uploading, onCancel }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [baseScale, setBaseScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch tracking
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
    const bs = CONTAINER_SIZE / Math.min(naturalWidth, naturalHeight);
    setBaseScale(bs);
    setImgLoaded(true);
  }, [imgRef]);

  // --- Pointer (mouse) drag ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // handled by touch events
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
  const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

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
      const newScale = Math.max(1, Math.min(3, touchState.current.lastScale * ratio));
      setScale(newScale);

      // Pan with center movement
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
    if (e.touches.length < 2) {
      touchState.current.dragging = false;
    }
    if (e.touches.length === 1) {
      touchState.current.lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchState.current.dragging = true;
    }
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.max(1, Math.min(3, prev - e.deltaY * 0.002)));
  }, []);

  const totalScale = baseScale * scale;
  const imgW = imgRef.current ? imgRef.current.naturalWidth * totalScale : CONTAINER_SIZE;
  const imgH = imgRef.current ? imgRef.current.naturalHeight * totalScale : CONTAINER_SIZE;

  return (
    <div className="flex flex-col items-center gap-3">
      {imageSrc && (
        <>
          <div
            ref={containerRef}
            className="rounded-full overflow-hidden border-4 border-primary/20 bg-muted relative cursor-grab active:cursor-grabbing"
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
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Zoom: {Math.round(scale * 100)}%
          </p>
        </>
      )}
      <p className="text-xs text-muted-foreground text-center flex items-center gap-1">
        <Move className="w-3.5 h-3.5" /> Geser & cubit 2 jari untuk zoom
      </p>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button className="flex-1 gap-2" onClick={() => onUpload(offsetX, offsetY, scale)} disabled={uploading || !imgLoaded}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Gunakan Foto
        </Button>
      </div>
    </div>
  );
};