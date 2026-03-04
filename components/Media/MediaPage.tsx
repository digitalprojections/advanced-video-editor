
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React, { useState } from 'react';
import { Upload, Plus, FileVideo, HardDrive, Filter, Grid, List as ListIcon, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { VideoAsset } from '../../types';
import { FFmpegService } from '../../services/ffmpegService';

interface MediaPageProps {
  assets: VideoAsset[];
  onAddAsset: (asset: VideoAsset) => void;
  onUpdateAsset: (id: string, updates: Partial<VideoAsset>) => void;
  onAddToTimeline: (asset: VideoAsset) => void;
}

const MediaPage: React.FC<MediaPageProps> = ({ assets, onAddAsset, onUpdateAsset, onAddToTimeline }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  /**
   * Background Worker: Extracts the real frame without blocking the UI.
   */
  const processThumbnailAsync = async (assetId: string, url: string, duration: number, fileName: string) => {
    try {
      const seekTime = duration > 1 ? 1 : 0;
      const thumbnail = await FFmpegService.getFrameAtTime(url, seekTime);
      onUpdateAsset(assetId, { thumbnail, status: 'ready' });
    } catch (err) {
      console.error(`Async thumbnail fail for ${fileName}:`, err);
      onUpdateAsset(assetId, { 
        thumbnail: 'https://api.dicebear.com/7.x/identicon/svg?seed=' + fileName,
        status: 'error'
      });
    }
  };

  /**
   * Enhanced Import: Immediately adds asset with placeholder, then background tasks the frame.
   */
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // @ts-ignore - Casting target to any to access files property
    const file = (e.target as any).files?.[0];
    if (!file) return;

    setImportError(null);
    setIsImporting(true);

    try {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.includes('video');
      
      let duration = 0;
      const assetId = Math.random().toString(36).substr(2, 9);

      if (isVideo) {
        // 1. Get Duration via Native HTML5 Video Element (Fast/Immediate)
        // @ts-ignore - Accessing document via window to avoid missing global definition
        const v = (window as any).document.createElement('video');
        v.src = url;
        await new Promise((resolve, reject) => {
          v.onloadedmetadata = () => {
            duration = v.duration;
            resolve(null);
          };
          v.onerror = () => reject(new Error("Failed to load video metadata"));
          setTimeout(() => reject(new Error("Metadata timeout")), 5000);
        });

        // 2. Add asset immediately with "processing" status
        const newAsset: VideoAsset = {
          id: assetId,
          name: file.name,
          url,
          duration,
          thumbnail: 'https://api.dicebear.com/7.x/shapes/svg?seed=' + file.name, // Temporary placeholder
          type: 'video',
          status: 'processing'
        };
        onAddAsset(newAsset);

        // 3. Kick off async FFmpeg processing (No await here!)
        processThumbnailAsync(assetId, url, duration, file.name);
      } else {
        // Audio doesn't need FFmpeg thumbnails
        const newAsset: VideoAsset = {
          id: assetId,
          name: file.name,
          url,
          duration: 5, // Placeholder
          thumbnail: 'https://api.dicebear.com/7.x/identicon/svg?seed=' + file.name,
          type: 'audio',
          status: 'ready'
        };
        onAddAsset(newAsset);
      }
    } catch (err: any) {
      console.error("Import failed: ", err);
      setImportError(err.message || "Failed to process media file.");
    } finally {
      setIsImporting(false);
      // @ts-ignore - Casting target to any to clear value
      (e.target as any).value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14]">
      {/* Header */}
      <div className="h-12 bg-[#1c212b] border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <label className={`flex items-center gap-2 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black cursor-pointer transition-all active:scale-95 shadow-lg shadow-orange-900/20 ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isImporting ? 'ANALYZING...' : 'IMPORT MEDIA'}
            <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileImport} />
          </label>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1 text-slate-500">
             <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-slate-800 text-slate-200' : 'hover:bg-slate-800'}`}><Grid className="w-4 h-4" /></button>
             <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-slate-800 text-slate-200' : 'hover:bg-slate-800'}`}><ListIcon className="w-4 h-4" /></button>
          </div>
          {importError && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/20 border border-red-500/30 rounded-lg text-[10px] text-red-400 font-bold uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
               <AlertCircle className="w-3 h-3" /> {importError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-slate-800 focus-within:border-orange-500/50 transition-colors">
            <Filter className="w-3 h-3" />
            <input type="text" placeholder="Search project bin..." className="bg-transparent text-[10px] outline-none w-40 font-bold uppercase tracking-widest placeholder:text-slate-700" />
          </div>
          <button className="hover:text-white transition-colors"><HardDrive className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Media Bin */}
      <div className="flex-1 overflow-y-auto p-8">
        {assets.length === 0 && !isImporting ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-3xl text-slate-700 group hover:border-orange-500/20 transition-all duration-500 bg-black/10">
            <div className="w-24 h-24 bg-slate-800/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-orange-600/10 transition-all duration-700">
               <Upload className="w-10 h-10 opacity-20 group-hover:opacity-100 group-hover:text-orange-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-slate-600 mb-2">Media Pool Empty</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800">Drag source clips here or use Import</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1'}`}>
             {assets.map(asset => (
               <div key={asset.id} className="group flex flex-col bg-[#1c212b] rounded-xl border border-slate-800 overflow-hidden hover:border-orange-500 transition-all shadow-2xl hover:-translate-y-1 duration-300">
                  <div className="aspect-video relative overflow-hidden bg-black">
                     <img 
                      src={asset.thumbnail} 
                      alt={asset.name} 
                      className={`w-full h-full object-cover transition-all duration-700 ${asset.status === 'processing' ? 'opacity-30 blur-sm scale-110' : 'opacity-90 group-hover:opacity-100'}`} 
                     />
                     
                     {asset.status === 'processing' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                           <RefreshCcw className="w-5 h-5 text-orange-500 animate-spin" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">Scanning...</span>
                        </div>
                     )}

                     <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 border border-white/5 text-[8px] font-black uppercase tracking-tighter text-white">
                        {asset.type === 'video' ? 'H.264' : 'WAV'}
                     </div>
                     <div className="absolute bottom-2 right-2 bg-orange-600 px-2 py-0.5 rounded text-[9px] font-black text-white shadow-lg">
                        {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toFixed(0).padStart(2, '0')}
                     </div>

                     {asset.status === 'ready' && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-300 backdrop-blur-[2px]">
                          <button 
                            onClick={() => onAddToTimeline(asset)}
                            className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0"
                          >
                            Place on Timeline
                          </button>
                        </div>
                     )}
                  </div>
                  <div className="p-4 bg-gradient-to-b from-[#1c212b] to-[#141820]">
                     <div className="text-[11px] font-black text-slate-200 truncate mb-1.5 tracking-wide">{asset.name}</div>
                     <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-black text-slate-600 flex items-center gap-1.5 tracking-widest">
                          <FileVideo className="w-3 h-3 text-orange-500" /> {asset.type}
                        </span>
                        <span className={`text-[8px] font-mono font-bold ${asset.status === 'error' ? 'text-red-500' : 'text-slate-700'}`}>
                           {asset.status === 'processing' ? 'QUEUED' : asset.status === 'error' ? 'SCAN FAIL' : '10-BIT • 4:2:2'}
                        </span>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPage;