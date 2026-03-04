
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Camera, 
  Maximize, 
  Volume2,
  Settings,
  Layers,
  Magnet,
  ChevronRight,
  ChevronLeft,
  Monitor,
  Loader2,
  Cpu,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { VideoAsset, TimelineClip, Snapshot } from '../../types';
import Timeline from './Timeline';
import { FFmpegService } from '../../services/ffmpegService';

interface EditPageProps {
  assets: VideoAsset[];
  timeline: TimelineClip[];
  setTimeline: React.Dispatch<React.SetStateAction<TimelineClip[]>>;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  togglePlayback: () => void;
  takeSnapshot: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  activeAsset: VideoAsset | null | undefined;
  onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onAddClipAtTime: (assetId: string, startTime: number) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  snapshots: Snapshot[];
}

const EditPage: React.FC<EditPageProps> = ({
  assets,
  timeline,
  setTimeline,
  currentTime,
  setCurrentTime,
  isPlaying,
  togglePlayback,
  takeSnapshot,
  videoRef,
  activeAsset,
  onTimeUpdate,
  onAddClipAtTime,
  onUpdateClip,
  snapshots
}) => {
  const [isProcessingSnapshot, setIsProcessingSnapshot] = useState(false);
  const [useFFmpegPreview, setUseFFmpegPreview] = useState(false);
  const [softwareFrame, setSoftwareFrame] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const isWasmSupported = FFmpegService.isSupported();

  useEffect(() => {
    let active = true;
    if (useFFmpegPreview && activeAsset && !isPlaying) {
      const render = async () => {
        setIsDecoding(true);
        try {
          const url = await FFmpegService.seekAndRenderFrame(activeAsset.url, currentTime);
          if (active) setSoftwareFrame(url);
        } catch (e) {
          console.error("Software Playback engine error:", e);
        } finally {
          if (active) setIsDecoding(false);
        }
      };
      
      const debounce = setTimeout(render, 150);
      return () => {
        active = false;
        clearTimeout(debounce);
      };
    } else {
      setSoftwareFrame(null);
    }
  }, [useFFmpegPreview, activeAsset, currentTime, isPlaying]);

  const handleHighResSnapshot = async () => {
    if (!activeAsset) return;
    setIsProcessingSnapshot(true);
    try {
      const dataUrl = await FFmpegService.getFrameAtTime(activeAsset.url, currentTime);
      takeSnapshot();
    } catch (e) {
      takeSnapshot();
    } finally {
      setIsProcessingSnapshot(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    // @ts-ignore
    (e.dataTransfer as any).setData('assetId', assetId);
    // @ts-ignore
    (e.dataTransfer as any).effectAllowed = 'copy';
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 flex min-h-0">
        <div className="w-64 bg-[#141820] border-r border-slate-800 flex flex-col">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Media Pool</h3>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 gap-2 flex flex-col">
            {assets.length === 0 ? (
              <div className="text-center mt-10 text-slate-600 px-4 opacity-50">
                <p className="text-[11px] font-bold uppercase tracking-widest">Bin Empty</p>
                <p className="text-[9px] mt-2">Go to MEDIA page to import source clips.</p>
              </div>
            ) : (
              assets.map(asset => (
                <div 
                  key={asset.id} 
                  draggable={asset.status === 'ready'}
                  onDragStart={(e) => handleDragStart(e, asset.id)}
                  className={`group relative bg-[#1c212b] rounded-lg p-2 border border-slate-700 hover:border-orange-500 transition-all cursor-grab active:cursor-grabbing shadow-lg overflow-hidden ${asset.status === 'processing' ? 'opacity-50 grayscale' : ''}`}
                >
                  <img src={asset.thumbnail} alt={asset.name} className="w-full h-20 object-cover rounded mb-2 opacity-80 group-hover:opacity-100 transition-opacity" crossOrigin="anonymous" />
                  <div className="text-[10px] font-black truncate text-slate-300">{asset.name}</div>
                  <div className="text-[8px] text-slate-500 uppercase font-black mt-1">{asset.type} • {asset.duration.toFixed(1)}s</div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-800 bg-black/20">
             <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Camera className="w-3 h-3" /> Snapshots
             </h3>
             <div className="grid grid-cols-2 gap-2">
                {snapshots.slice(0, 4).map(s => (
                  <div key={s.id} className="relative group overflow-hidden rounded-lg border border-slate-700 shadow-xl ring-1 ring-white/5">
                    <img src={s.dataUrl} className="w-full aspect-video object-cover hover:scale-110 transition-transform duration-500" />
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#050608] relative">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden group border border-slate-800 ring-1 ring-white/5">
              
              {activeAsset ? (
                useFFmpegPreview && softwareFrame ? (
                   <img src={softwareFrame} className="w-full h-full object-contain animate-in fade-in duration-300" alt="FFmpeg Render" />
                ) : (
                  <video ref={videoRef} src={activeAsset.url} className={`w-full h-full object-contain ${useFFmpegPreview ? 'opacity-20 blur-sm' : 'opacity-100'}`} crossOrigin="anonymous" />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800">
                  <Monitor className="w-20 h-20 mb-4 opacity-5" />
                  <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20">No Source Selected</p>
                </div>
              )}

              <div className="absolute top-6 left-6 flex gap-3">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl border transition-all ${useFFmpegPreview ? 'bg-orange-600 text-white border-orange-400' : 'bg-black/60 text-slate-400 border-white/10'}`}>
                  {useFFmpegPreview ? <Sparkles className="w-3 h-3 animate-pulse" /> : <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                  {useFFmpegPreview ? 'Software Engine (WASM)' : 'Native Hardware'}
                </div>
              </div>
              
              <div className="absolute bottom-6 right-6 bg-black/60 px-4 py-1.5 rounded-full text-xs font-mono text-orange-500 border border-white/10 shadow-2xl">
                {new Date(currentTime * 1000).toISOString().substr(11, 11)}
              </div>
            </div>
          </div>

          <div className="h-16 bg-[#141820] border-t border-slate-800 flex items-center justify-between px-8 shadow-2xl">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => isWasmSupported ? setUseFFmpegPreview(!useFFmpegPreview) : null}
                className={`flex flex-col items-center gap-1 group transition-all ${useFFmpegPreview ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'} ${!isWasmSupported ? 'opacity-30 cursor-help' : ''}`}
                title={isWasmSupported ? "Toggle FFmpeg Software Playback Engine" : "Software Engine unavailable"}
              >
                <div className={`p-2 rounded-lg border transition-all ${useFFmpegPreview ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-800/50 border-white/5 group-hover:bg-slate-700'}`}>
                  {isWasmSupported ? <Cpu className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest">{isWasmSupported ? 'Software' : 'Engine Blocked'}</span>
              </button>
              
              <button onClick={handleHighResSnapshot} className="flex flex-col items-center gap-1 group text-slate-500 hover:text-orange-500 transition-all">
                <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 group-hover:bg-slate-700">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest">Snapshot</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentTime(Math.max(0, currentTime - 0.04))} className="p-2 text-slate-500 hover:text-white transition-colors" title="Frame Back"><SkipBack className="w-6 h-6" /></button>
              <button 
                onClick={togglePlayback} 
                className="w-14 h-14 flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white rounded-2xl transition-all active:scale-90 shadow-[0_0_30px_rgba(234,88,12,0.3)] border border-orange-400/30"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 ml-1" fill="currentColor" />}
              </button>
              <button onClick={() => setCurrentTime(currentTime + 0.04)} className="p-2 text-slate-500 hover:text-white transition-colors" title="Frame Forward"><SkipForward className="w-6 h-6" /></button>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <div className="w-20 h-1 bg-slate-700 rounded-full">
                     <div className="h-full bg-orange-500 w-[70%]" />
                  </div>
               </div>
               <button className="p-2 text-slate-500 hover:text-white transition-colors"><Maximize className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-80 bg-[#0d1016] flex flex-col border-t border-slate-800 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
        <div className="h-10 bg-[#141820] border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="p-1 rounded bg-orange-600/10 border border-orange-500/30 group-hover:bg-orange-600/20">
                <Magnet className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-slate-200">Snapping</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
               Track Mixer
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${activeAsset ? 'bg-orange-500 animate-pulse' : 'bg-slate-800'}`} />
                PLAYHEAD: <span className={activeAsset ? 'text-orange-500 font-bold' : ''}>{activeAsset ? 'SOURCE_TRUTH' : 'IDLE'}</span>
             </div>
          </div>
        </div>
        
        <div className="flex-1 relative overflow-hidden bg-[#0a0c10]">
          <Timeline 
            timeline={timeline} 
            currentTime={currentTime} 
            setCurrentTime={setCurrentTime}
            assets={assets}
            onAddClipAtTime={onAddClipAtTime}
            onUpdateClip={onUpdateClip}
          />
        </div>
      </div>
    </div>
  );
};

export default EditPage;
