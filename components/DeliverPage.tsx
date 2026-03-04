
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React from 'react';
import { Share2, Video, HardDrive, Youtube, Instagram, Twitter, Download } from 'lucide-react';
import { TimelineClip, VideoAsset } from '../types';

interface DeliverPageProps {
  timeline: TimelineClip[];
  assets: VideoAsset[];
}

const DeliverPage: React.FC<DeliverPageProps> = ({ timeline, assets }) => {
  return (
    <div className="flex-1 flex bg-[#0b0e14]">
      {/* Left Settings Panel */}
      <div className="w-80 bg-[#1c212b] border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
           <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Render Settings</h2>
        </div>
        
        <div className="flex-1 p-4 space-y-6">
           <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 block">Preset</label>
              <div className="grid grid-cols-3 gap-2">
                 {[Youtube, Instagram, Twitter, Video, HardDrive].map((Icon, i) => (
                    <button key={i} className="flex flex-col items-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors">
                       <Icon className="w-5 h-5 text-slate-400" />
                       <span className="text-[8px] font-bold text-slate-500 uppercase">
                          {['YT', 'Insta', 'Tweet', 'Web', 'File'][i]}
                       </span>
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="space-y-1">
                 <label className="text-[10px] text-slate-500 uppercase font-bold">Filename</label>
                 <input type="text" defaultValue="Master_Project_01" className="w-full bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-orange-500" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] text-slate-500 uppercase font-bold">Location</label>
                 <div className="flex gap-2">
                    <input type="text" readOnly value="/Users/Exports/" className="flex-1 bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-slate-500" />
                    <button className="px-3 py-1 bg-slate-800 text-[10px] rounded border border-slate-700">Browse</button>
                 </div>
              </div>
           </div>

           <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-slate-500 uppercase font-bold">Format</span>
                 <select className="bg-slate-800 text-[10px] px-2 py-1 rounded outline-none border border-slate-700">
                    <option>QuickTime</option>
                    <option>MP4</option>
                    <option>H.264</option>
                 </select>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-slate-500 uppercase font-bold">Resolution</span>
                 <span className="text-[10px] text-slate-300">1920 x 1080 HD</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-slate-500 uppercase font-bold">Frame Rate</span>
                 <span className="text-[10px] text-slate-300">23.976 fps</span>
              </div>
           </div>
        </div>

        <div className="p-4 bg-black/20">
           <button className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl">
              <Download className="w-4 h-4" /> Add to Render Queue
           </button>
        </div>
      </div>

      {/* Main Preview/Queue Area */}
      <div className="flex-1 flex flex-col p-8 gap-8">
         <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-slate-800">
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 opacity-20">
                  <Video className="w-32 h-32 mb-4" />
                  <span className="text-2xl font-black uppercase tracking-[0.3em]">Ready for Render</span>
               </div>
            </div>
         </div>

         <div className="h-64 flex flex-col">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Render Queue</h3>
               <span className="text-[10px] text-slate-600">0 jobs active</span>
            </div>
            <div className="flex-1 bg-[#1c212b] border border-slate-800 rounded-xl flex items-center justify-center text-slate-600 italic text-sm">
               Queue is empty. Select a preset and add a job to start rendering.
            </div>
         </div>
      </div>
    </div>
  );
};

export default DeliverPage;
