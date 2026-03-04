
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React, { useState, useEffect } from 'react';
import { Share2, Video, HardDrive, Youtube, Instagram, Twitter, Download, Loader2, CheckCircle2, Terminal, AlertTriangle, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';
import { TimelineClip, VideoAsset } from '../../types';
import { FFmpegService } from '../../services/ffmpegService';

interface DeliverPageProps {
  timeline: TimelineClip[];
  assets: VideoAsset[];
}

const DeliverPage: React.FC<DeliverPageProps> = ({ timeline, assets }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'rendering' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompatMode, setIsCompatMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const initFFmpeg = async () => {
    try {
      setErrorMessage(null);
      setStatus('loading');
      
      const env = FFmpegService.checkEnvironment();
      setIsCompatMode(!env.multiThreading);

      await FFmpegService.load((msg) => {
        setLogs(prev => [...prev.slice(-30), msg]);
      }, (p) => {
        setProgress(p);
      });
      setStatus('idle');
    } catch (e: any) {
      console.error("FFmpeg Load Error", e);
      setErrorMessage(e.message || "Initialization timed out or failed.");
      setStatus('error');
    }
  };

  useEffect(() => {
    initFFmpeg();
  }, []);

  const handleRender = async () => {
    if (timeline.length === 0) return;
    try {
      setStatus('rendering');
      setProgress(0);
      setLogs(prev => [...prev, "--- STARTING RENDER SEQUENCE ---"]);
      
      const blob = await FFmpegService.renderTimeline(timeline, assets, 'GeminiResolve_Master.mp4', (p) => {
          setProgress(p);
      });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setStatus('completed');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMessage("Render process crashed. Check logs for details.");
    }
  };

  return (
    <div className="flex-1 flex bg-[#0b0e14]">
      {/* Sidebar: Pro Export Settings */}
      <div className="w-80 bg-[#1c212b] border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-black/20">
           <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] text-center">FFmpeg Master Delivery</h2>
        </div>
        
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
           {status === 'loading' && (
             <div className="flex flex-col items-center justify-center p-12 text-center bg-black/40 rounded-xl border border-slate-800 animate-in fade-in zoom-in duration-300">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Booting WASM VM...</p>
             </div>
           )}

           {isCompatMode && status !== 'error' && status !== 'loading' && (
             <div className="p-4 bg-amber-900/10 border border-amber-500/30 rounded-xl text-center shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest">Compatibility Mode</p>
                </div>
                <p className="text-[8px] text-amber-200/60 leading-relaxed font-medium">
                  Missing security headers detected. Multi-threading is disabled. 
                  Rendering will be significantly slower.
                </p>
             </div>
           )}

           {status === 'error' && (
             <div className="p-6 bg-red-900/10 border border-red-500/30 rounded-xl text-center shadow-2xl">
                <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4" />
                <p className="text-[11px] text-red-100 uppercase font-black tracking-widest mb-2">Engine Failure</p>
                <div className="text-[9px] text-red-400/80 mb-6 leading-relaxed bg-black/40 p-3 rounded border border-red-900/50 text-left font-mono break-words">
                   {errorMessage}
                </div>
                <button 
                  onClick={initFFmpeg}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Initialize Engine
                </button>
             </div>
           )}

           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest">Format Presets</label>
              <div className="grid grid-cols-2 gap-2">
                 {[
                    { icon: Youtube, label: 'YouTube 4K' },
                    { icon: Video, label: 'Web Master' },
                    { icon: Instagram, label: 'Vertical Social' },
                    { icon: HardDrive, label: 'ProRes Proxy' }
                 ].map((preset, i) => (
                    <button key={i} className="flex flex-col items-center gap-2 p-3 bg-slate-800/50 hover:bg-orange-600/20 rounded-lg border border-slate-700 transition-all hover:border-orange-500/50 group">
                       <preset.icon className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
                       <span className="text-[8px] font-bold text-slate-500 group-hover:text-slate-200">{preset.label}</span>
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-[10px]">
                 <span className="text-slate-500 font-bold uppercase tracking-wider">Engine</span>
                 <span className={`${isCompatMode ? 'text-amber-500' : 'text-green-500'} bg-black/40 px-2 py-0.5 rounded-full border border-white/5`}>
                   FFMPEG {isCompatMode ? 'ST' : 'MT'}
                 </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                 <span className="text-slate-500 font-bold uppercase tracking-wider">Status</span>
                 <span className={status === 'error' ? 'text-red-500' : 'text-slate-400'}>
                    {status.toUpperCase()}
                 </span>
              </div>
           </div>

           {status === 'rendering' && (
             <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-orange-500/20 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="flex justify-between text-[10px] font-black tracking-widest">
                   <span className="text-orange-500 animate-pulse uppercase">Encoding Master...</span>
                   <span className="text-slate-300 font-mono">{(progress * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-[8px] text-slate-600 uppercase font-bold text-center">Do not close the browser during render</p>
             </div>
           )}
        </div>

        <div className="p-4 bg-black/40 border-t border-slate-800">
           {status === 'completed' && outputUrl ? (
             <a 
              href={outputUrl} 
              download="GeminiResolve_Master_Export.mp4"
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-2xl shadow-green-900/20 active:scale-95"
             >
                <Download className="w-4 h-4" /> Download Final Master
             </a>
           ) : (
             <button 
              disabled={status !== 'idle' || timeline.length === 0}
              onClick={handleRender}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:grayscale text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-2xl shadow-orange-900/40 active:scale-95"
             >
                {status === 'rendering' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Render Timeline
             </button>
           )}
        </div>
      </div>

      {/* Main Preview/Terminal Area */}
      <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto">
         <div className="flex-1 flex items-center justify-center relative">
            <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative border border-slate-800/50 group">
               {status === 'completed' && outputUrl ? (
                 <video src={outputUrl} controls className="w-full h-full object-contain animate-in fade-in duration-700" />
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                    <Video className={`w-32 h-32 mb-4 opacity-5 transition-all duration-1000 ${status === 'rendering' ? 'scale-110 opacity-10 blur-sm' : ''}`} />
                    <span className="text-xl font-black uppercase tracking-[0.4em] opacity-30 text-center px-4">
                      {status === 'rendering' ? 'WASM Frame Processing' : 'Mastering Suite'}
                    </span>
                 </div>
               )}
            </div>
         </div>

         {/* FFmpeg Logs Console */}
         <div className="h-60 flex flex-col">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Terminal className="w-4 h-4" /> FFmpeg Runtime Debugger
               </h3>
               {status === 'completed' && <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase"><CheckCircle2 className="w-4 h-4" /> Render Successful</div>}
            </div>
            <div className="flex-1 bg-black border border-slate-800 rounded-2xl p-6 font-mono text-[9px] text-slate-500 overflow-y-auto shadow-inner">
               {logs.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-20">
                    <Terminal className="w-8 h-8 mb-2" />
                    <p className="uppercase tracking-widest font-black">Ready for instructions</p>
                 </div>
               ) : (
                 <div className="space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className={`flex gap-4 border-l-2 pl-4 transition-colors ${log.toLowerCase().includes('error') ? 'border-red-500 bg-red-500/5 text-red-400' : 'border-slate-800 hover:border-orange-500/50'}`}>
                           <span className="text-slate-700 select-none">[{i.toString().padStart(4, '0')}]</span>
                           <span className="leading-relaxed">{log}</span>
                        </div>
                    ))}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default DeliverPage;
