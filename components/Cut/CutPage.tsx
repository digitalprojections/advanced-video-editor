
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React from 'react';
import { Scissors, Zap, Split, ArrowLeftRight } from 'lucide-react';
import { VideoAsset, TimelineClip } from '../../types';

interface CutPageProps {
  assets: VideoAsset[];
  timeline: TimelineClip[];
  currentTime: number;
  setCurrentTime: (time: number) => void;
}

const CutPage: React.FC<CutPageProps> = ({ assets, timeline, currentTime, setCurrentTime }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14]">
      {/* Upper Section: Duel Viewer */}
      <div className="flex-1 flex p-6 gap-6">
        <div className="flex-1 bg-black rounded-lg border border-slate-800 overflow-hidden relative shadow-2xl">
           <div className="absolute top-4 left-4 text-[10px] text-white/50 bg-black/50 px-2 py-1 rounded">SOURCE</div>
           <div className="h-full flex items-center justify-center text-slate-700 uppercase tracking-[0.2em] font-light">Asset Preview</div>
        </div>
        <div className="flex-1 bg-black rounded-lg border border-orange-500/20 overflow-hidden relative shadow-2xl">
           <div className="absolute top-4 left-4 text-[10px] text-orange-500 bg-black/50 px-2 py-1 rounded">PROGRAM</div>
           <div className="h-full flex items-center justify-center text-slate-700 uppercase tracking-[0.2em] font-light">Timeline Preview</div>
        </div>
      </div>

      {/* Cut Operations Bar */}
      <div className="h-16 bg-[#1c212b] border-t border-b border-slate-800 flex items-center justify-center gap-8">
         <button className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center group-hover:bg-orange-600 transition-colors">
               <Scissors className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300">SMART INSERT</span>
         </button>
         <button className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center group-hover:bg-orange-600 transition-colors">
               <Zap className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300">FAST CUT</span>
         </button>
         <button className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center group-hover:bg-orange-600 transition-colors">
               <Split className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300">RIPPLE OVERWRITE</span>
         </button>
         <button className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center group-hover:bg-orange-600 transition-colors">
               <ArrowLeftRight className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300">SWAP EDIT</span>
         </button>
      </div>

      {/* Assembly Timeline */}
      <div className="h-40 bg-[#0d1016] p-4 flex flex-col gap-2">
         <div className="flex-1 bg-[#1c212b]/50 rounded-lg flex items-center px-10 gap-2 border border-slate-800 relative">
            {timeline.map(clip => (
               <div 
                 key={clip.id} 
                 className="h-12 bg-slate-700/50 border border-slate-600 rounded flex items-center justify-center px-4"
                 style={{ width: clip.duration * 10 }}
               >
                 <span className="text-[10px] text-slate-500">Clip</span>
               </div>
            ))}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-white" />
         </div>
         <p className="text-[10px] text-center text-slate-600">The Cut page provides a dual-timeline interface for high-speed assembly and rapid trimming.</p>
      </div>
    </div>
  );
};

export default CutPage;
