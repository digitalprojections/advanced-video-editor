
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React, { useRef, useEffect, useState } from 'react';
import { VideoAsset, TimelineClip } from '../../types';

interface TimelineProps {
  timeline: TimelineClip[];
  currentTime: number;
  setCurrentTime: (time: number) => void;
  assets: VideoAsset[];
  onAddClipAtTime: (assetId: string, startTime: number) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  timeline, 
  currentTime, 
  setCurrentTime, 
  assets, 
  onAddClipAtTime,
  onUpdateClip
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isOver, setIsOver] = useState(false);
  
  // Trimming & Moving State
  const [trimmingClip, setTrimmingClip] = useState<string | null>(null);
  const [trimSide, setTrimSide] = useState<'start' | 'end' | null>(null);
  const [movingClip, setMovingClip] = useState<{ id: string, startX: number, initialStart: number } | null>(null);
  
  // Pixels per second
  const SCALE = 50; 
  const totalDuration = Math.max(600, ...timeline.map(c => c.startTime + c.duration)) + 60;

  /**
   * Helper: Check if a proposed range overlaps with any other clip on the same layer
   */
  const checkCollision = (id: string, start: number, duration: number, layer: number): boolean => {
    return timeline.some(clip => {
      if (clip.id === id || clip.layer !== layer) return false;
      const otherEnd = clip.startTime + clip.duration;
      const proposedEnd = start + duration;
      return (start < otherEnd && proposedEnd > clip.startTime);
    });
  };

  /**
   * Helper: Find the nearest boundary (either another clip or timeline start)
   */
  const getBoundary = (id: string, proposedStart: number, duration: number, layer: number, side: 'left' | 'right'): number => {
    let bound = side === 'left' ? 0 : Infinity;
    
    timeline.forEach(clip => {
      if (clip.id === id || clip.layer !== layer) return;
      
      const otherEnd = clip.startTime + clip.duration;
      if (side === 'left') {
        if (otherEnd <= proposedStart) bound = Math.max(bound, otherEnd);
      } else {
        if (clip.startTime >= proposedStart + duration) bound = Math.min(bound, clip.startTime);
      }
    });
    
    return bound;
  };

  /**
   * Playhead interaction logic
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only move playhead if clicking on the ruler or empty track space
    // @ts-ignore
    if ((e.target as any).closest('.clip-element')) return;
    
    setIsDraggingPlayhead(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if ((isDraggingPlayhead || e.type === 'mousedown') && containerRef.current) {
      // @ts-ignore
      const rect = (containerRef.current as any).getBoundingClientRect();
      // @ts-ignore
      const x = (e as any).clientX - rect.left + (containerRef.current as any).scrollLeft;
      const newTime = Math.max(0, x / SCALE);
      setCurrentTime(newTime);
    }
  };

  /**
   * Clip Drag (Moving) Interaction
   */
  const handleClipDragStart = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    e.preventDefault();
    setMovingClip({
      id: clip.id,
      startX: e.clientX,
      initialStart: clip.startTime
    });
  };

  /**
   * Trimming Interaction Logic
   */
  const handleTrimStart = (e: React.MouseEvent, clipId: string, side: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    setTrimmingClip(clipId);
    setTrimSide(side);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: any) => {
      if (!containerRef.current) return;

      // Handle Clip Moving
      if (movingClip) {
        const clip = timeline.find(c => c.id === movingClip.id);
        if (!clip) return;

        const deltaX = e.clientX - movingClip.startX;
        const deltaTime = deltaX / SCALE;
        let newStartTime = Math.max(0, movingClip.initialStart + deltaTime);

        // Collision constraint for moving
        if (checkCollision(movingClip.id, newStartTime, clip.duration, clip.layer)) {
          if (deltaTime > 0) { // Moving right
            const bound = getBoundary(movingClip.id, clip.startTime, clip.duration, clip.layer, 'right');
            newStartTime = Math.min(newStartTime, bound - clip.duration);
          } else { // Moving left
            const bound = getBoundary(movingClip.id, clip.startTime, clip.duration, clip.layer, 'left');
            newStartTime = Math.max(newStartTime, bound);
          }
        }

        onUpdateClip(movingClip.id, { startTime: newStartTime });
        return;
      }

      // Handle Clip Trimming
      if (trimmingClip && trimSide) {
        const clip = timeline.find(c => c.id === trimmingClip);
        const asset = assets.find(a => a.id === clip?.assetId);
        if (!clip || !asset) return;

        // @ts-ignore
        const rect = (containerRef.current as any).getBoundingClientRect();
        // @ts-ignore
        const mouseX = (e as any).clientX - rect.left + (containerRef.current as any).scrollLeft;
        const mouseTime = Math.max(0, mouseX / SCALE);

        if (trimSide === 'start') {
          const bound = getBoundary(trimmingClip, clip.startTime, clip.duration, clip.layer, 'left');
          let newStartTime = Math.max(bound, mouseTime);
          
          // Constrain by asset duration
          const maxShift = clip.duration - 0.1;
          const shift = newStartTime - clip.startTime;
          if (shift > maxShift) newStartTime = clip.startTime + maxShift;
          
          const delta = newStartTime - clip.startTime;
          const newDuration = clip.duration - delta;
          const newOffset = clip.offset + delta;
          
          if (newOffset >= 0 && newOffset < asset.duration) {
            onUpdateClip(trimmingClip, { 
              startTime: newStartTime, 
              duration: newDuration, 
              offset: newOffset 
            });
          }
        } else {
          const bound = getBoundary(trimmingClip, clip.startTime, clip.duration, clip.layer, 'right');
          let newDuration = Math.max(0.1, mouseTime - clip.startTime);
          
          // Constrain by adjacent clip
          if (clip.startTime + newDuration > bound) {
            newDuration = bound - clip.startTime;
          }

          // Constrain by asset length
          if (clip.offset + newDuration > asset.duration) {
            newDuration = asset.duration - clip.offset;
          }

          onUpdateClip(trimmingClip, { duration: newDuration });
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setTrimmingClip(null);
      setTrimSide(null);
      setMovingClip(null);
    };

    if (trimmingClip || movingClip) {
      // @ts-ignore
      (window as any).addEventListener('mousemove', handleGlobalMouseMove);
      // @ts-ignore
      (window as any).addEventListener('mouseup', handleGlobalMouseUp);
      // @ts-ignore
      (window as any).document.body.style.cursor = trimmingClip ? 'col-resize' : 'move';
    }

    return () => {
      // @ts-ignore
      (window as any).removeEventListener('mousemove', handleGlobalMouseMove);
      // @ts-ignore
      (window as any).removeEventListener('mouseup', handleGlobalMouseUp);
      // @ts-ignore
      (window as any).document.body.style.cursor = '';
    };
  }, [trimmingClip, trimSide, movingClip, timeline, assets, onUpdateClip]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // @ts-ignore
    (e.dataTransfer as any).dropEffect = 'copy';
    setIsOver(true);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    if (!containerRef.current) return;
    
    // @ts-ignore
    const assetId = (e.dataTransfer as any).getData('assetId');
    if (!assetId) return;

    // @ts-ignore
    const rect = (containerRef.current as any).getBoundingClientRect();
    // @ts-ignore
    const x = (e as any).clientX - rect.left + (containerRef.current as any).scrollLeft;
    const dropTime = Math.max(0, x / SCALE);

    onAddClipAtTime(assetId, dropTime);
  };

  useEffect(() => {
    const up = () => setIsDraggingPlayhead(false);
    const move = (e: MouseEvent) => isDraggingPlayhead && handleMouseMove(e);
    // @ts-ignore
    (window as any).addEventListener('mouseup', up);
    // @ts-ignore
    (window as any).addEventListener('mousemove', move);
    return () => {
      // @ts-ignore
      (window as any).removeEventListener('mouseup', up);
      // @ts-ignore
      (window as any).removeEventListener('mousemove', move);
    };
  }, [isDraggingPlayhead]);

  const renderRuler = () => {
    const ticks = [];
    for (let i = 0; i < totalDuration; i += 5) {
      ticks.push(
        <div key={i} className="absolute flex flex-col items-center" style={{ left: i * SCALE }}>
          <div className="h-2 w-[1px] bg-slate-700" />
          <span className="text-[9px] text-slate-500 mt-1 font-mono">{new Date(i * 1000).toISOString().substr(14, 5)}</span>
        </div>
      );
    }
    return ticks;
  };

  return (
    <div 
      ref={containerRef}
      className={`h-full w-full overflow-x-auto relative cursor-crosshair select-none transition-colors ${isOver ? 'bg-orange-500/5' : ''}`}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="h-8 border-b border-slate-800 bg-[#1c212b] sticky top-0 z-20 w-max min-w-full">
        {renderRuler()}
      </div>

      <div className="w-max min-w-full p-4 space-y-2">
        <div className="h-14 bg-[#1c212b]/30 rounded-lg relative border border-dashed border-slate-800">
           <div className="absolute -left-2 top-0 bottom-0 flex items-center justify-center px-1 bg-[#2d333f] border-r border-slate-700 rounded-l">
              <span className="text-[8px] vertical-text font-bold text-slate-500">V2</span>
           </div>
        </div>

        <div className="h-14 bg-[#1c212b]/30 rounded-lg relative border border-slate-800">
           <div className="absolute -left-2 top-0 bottom-0 flex items-center justify-center px-1 bg-[#2d333f] border-r border-slate-700 rounded-l">
              <span className="text-[8px] vertical-text font-bold text-slate-500">V1</span>
           </div>
           {timeline.map(clip => {
             const asset = assets.find(a => a.id === clip.assetId);
             const isActive = currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration;
             
             return (
                <div 
                  key={clip.id}
                  onMouseDown={(e) => handleClipDragStart(e, clip)}
                  className={`clip-element absolute top-1 bottom-1 bg-blue-600/40 border border-blue-400 rounded overflow-hidden flex flex-col justify-center px-2 group cursor-move ${
                    isActive ? 'ring-2 ring-white ring-inset' : ''
                  }`}
                  style={{ left: clip.startTime * SCALE, width: clip.duration * SCALE }}
                >
                  <span className="text-[9px] font-bold text-white truncate drop-shadow-md select-none">{asset?.name}</span>
                  <div onMouseDown={(e) => handleTrimStart(e, clip.id, 'start')} className="absolute left-0 top-0 bottom-0 w-2 bg-blue-400/50 cursor-col-resize hover:bg-white z-10" />
                  <div onMouseDown={(e) => handleTrimStart(e, clip.id, 'end')} className="absolute right-0 top-0 bottom-0 w-2 bg-blue-400/50 cursor-col-resize hover:bg-white z-10" />
                </div>
             );
           })}
        </div>

        <div className="h-10 bg-[#1c212b]/30 rounded-lg relative border border-slate-800 mt-8">
           <div className="absolute -left-2 top-0 bottom-0 flex items-center justify-center px-1 bg-[#2d333f] border-r border-slate-700 rounded-l">
              <span className="text-[8px] vertical-text font-bold text-slate-500">A1</span>
           </div>
           <div className="absolute inset-0 flex items-center justify-around opacity-20 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <div key={i} className="w-[2px] bg-green-500" style={{ height: Math.random() * 80 + '%' }} />
              ))}
           </div>
        </div>
      </div>

      <div 
        className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
        style={{ left: currentTime * SCALE }}
      >
        <div className="w-4 h-4 bg-red-500 rounded-full -ml-[7px] -mt-1 shadow-md flex items-center justify-center border border-white/20">
           <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
