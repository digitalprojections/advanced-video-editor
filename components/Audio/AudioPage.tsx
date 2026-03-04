
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React, { useState, useRef, useEffect } from 'react';
import { Music, Mic, Volume2, AudioWaveform, Square, Activity, Loader2, Save } from 'lucide-react';
import { VideoAsset, TimelineClip } from '../../types';
import { FFmpegService } from '../../services/ffmpegService';

interface AudioPageProps {
  assets: VideoAsset[];
  timeline: TimelineClip[];
}

const AudioPage: React.FC<AudioPageProps> = ({ assets, timeline }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [meterLevels, setMeterLevels] = useState<number[]>([0, 0, 0, 0]);
  
  // @ts-ignore - Casting to any for MediaRecorder which might be missing in type definitions
  const mediaRecorder = useRef<any | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const meterInterval = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      // @ts-ignore - Accessing window.setInterval to avoid missing global definition
      meterInterval.current = (window as any).setInterval(() => {
        setMeterLevels(prev => prev.map(() => Math.random() * 80 + 20));
      }, 100);
    } else {
      if (meterInterval.current) clearInterval(meterInterval.current);
      setMeterLevels([0, 0, 0, 0]);
    }
    return () => {
      if (meterInterval.current) clearInterval(meterInterval.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // @ts-ignore - Casting navigator to any to access mediaDevices
      const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
      // @ts-ignore - Accessing MediaRecorder via window and casting to any
      mediaRecorder.current = new (window as any).MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e: any) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach((t: any) => t.stop());
    }
  };

  const handleMergeDub = async () => {
    if (!recordedBlob || timeline.length === 0) return;
    setIsMerging(true);
    try {
        // Find the first video asset on timeline to "dub" onto
        const targetClip = timeline[0];
        const asset = assets.find(a => a.id === targetClip.assetId);
        if (asset) {
            const audioUrl = URL.createObjectURL(recordedBlob);
            const mergedBlob = await FFmpegService.mergeAudio(asset.url, audioUrl, 'dubbed_video.mp4');
            const url = URL.createObjectURL(mergedBlob);
            
            // Logic to update the asset in the project would go here
            console.log("Audio Dubbed successfully", url);
            // Simulate download for user
            // @ts-ignore - Accessing document via window to avoid missing global definition
            const a = (window as any).document.createElement('a');
            a.href = url;
            a.download = "Dubbed_Preview.mp4";
            a.click();
        }
    } catch (e) {
        console.error("Dub merge failed", e);
    } finally {
        setIsMerging(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14]">
      {/* Upper Section: Track Mixer */}
      <div className="flex-1 flex p-6 gap-6">
        {/* Mixer Tracks */}
        <div className="flex-1 flex gap-2 overflow-x-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-48 bg-[#1c212b] border border-slate-800 rounded-lg flex flex-col p-4 group">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Audio {i}</span>
                <Volume2 className="w-3 h-3 text-slate-500" />
              </div>
              
              <div className="flex-1 flex gap-4">
                 {/* Fader */}
                 <div className="flex-1 relative flex flex-col items-center">
                    <div className="w-1.5 h-full bg-black rounded-full relative">
                       <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-6 h-10 bg-slate-700 border border-slate-600 rounded shadow-lg cursor-ns-resize hover:bg-slate-600 transition-colors" />
                    </div>
                    <div className="absolute right-[-12px] h-full flex flex-col justify-between text-[8px] text-slate-600 font-mono py-2">
                       <span>+12</span><span>0</span><span>-12</span><span>-36</span><span>-INF</span>
                    </div>
                 </div>
                 
                 {/* Meter */}
                 <div className="w-6 h-full bg-black rounded relative overflow-hidden ring-1 ring-slate-800">
                    <div 
                      className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 via-yellow-400 to-red-500 transition-all duration-100" 
                      style={{ height: meterLevels[i-1] + '%' }}
                    />
                 </div>
              </div>

              <div className="mt-4 flex gap-1">
                 <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-[10px] py-1 rounded border border-slate-700 font-bold">M</button>
                 <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-[10px] py-1 rounded border border-slate-700 font-bold">S</button>
                 <button className={`flex-1 text-[10px] py-1 rounded border font-bold transition-colors ${i === 1 && isRecording ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-red-500'}`}>R</button>
              </div>
            </div>
          ))}

          {/* Master Bus */}
          <div className="w-48 bg-[#1c212b] border border-orange-500/30 rounded-lg flex flex-col p-4 ring-1 ring-orange-500/20">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Master</span>
                <Activity className="w-3 h-3 text-orange-500" />
              </div>
              
              <div className="flex-1 flex gap-4">
                 <div className="flex-1 relative flex flex-col items-center">
                    <div className="w-1.5 h-full bg-black rounded-full relative">
                       <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-6 h-10 bg-orange-600 rounded shadow-lg cursor-ns-resize" />
                    </div>
                 </div>
                 <div className="w-8 h-full bg-black rounded relative overflow-hidden flex gap-[1px]">
                    <div className="flex-1 bg-gradient-to-t from-green-500 via-yellow-400 to-red-500 h-[60%]" />
                    <div className="flex-1 bg-gradient-to-t from-green-500 via-yellow-400 to-red-500 h-[62%]" />
                 </div>
              </div>
              <div className="mt-4 text-[10px] font-bold text-center text-slate-400 bg-black/40 py-1 rounded">STEREO OUT</div>
          </div>
        </div>

        {/* Live Dubbing & Preview */}
        <div className="w-96 flex flex-col gap-6">
           <div className="flex-1 bg-black rounded-xl overflow-hidden relative group border border-slate-800">
              <div className="absolute inset-0 flex items-center justify-center">
                 <AudioWaveform className={`w-20 h-20 text-orange-500/30 transition-all ${isRecording ? 'animate-pulse scale-125' : ''}`} />
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                 {isRecording && (
                    <div className="bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 animate-pulse text-white shadow-lg">
                        <Mic className="w-3 h-3" /> DUBBING ACTIVE
                    </div>
                 )}
              </div>
           </div>

           <div className="bg-[#1c212b] p-6 rounded-xl border border-slate-800 shadow-xl">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
                 <Mic className="w-4 h-4 text-orange-500" /> 
                 Professional Dubbing Console
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Input: Default Micro</span>
                    <span className={isRecording ? 'text-red-500' : 'text-green-500'}>
                        {isRecording ? 'STREAMING' : 'READY'}
                    </span>
                 </div>
                 <div className="h-2 bg-black rounded-full overflow-hidden border border-slate-800">
                    <div 
                        className={`h-full transition-all duration-75 ${isRecording ? 'bg-red-500' : 'bg-green-500'}`} 
                        style={{ width: isRecording ? Math.random() * 50 + 20 + '%' : '0%' }} 
                    />
                 </div>
                 
                 <div className="flex gap-2">
                    <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
                        isRecording ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                    >
                        {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                        <span className="font-bold uppercase tracking-widest text-[10px]">
                        {isRecording ? 'Stop' : 'Start Recording'}
                        </span>
                    </button>
                    
                    {recordedBlob && !isRecording && (
                        <button 
                            disabled={isMerging}
                            onClick={handleMergeDub}
                            className="px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                            title="Commit Dub to FFmpeg Render"
                        >
                            {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                    )}
                 </div>
                 
                 <p className="text-[9px] text-slate-600 text-center uppercase tracking-widest font-bold">
                    FFmpeg will merge your recording with the visual timeline
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* Mini Timeline Context */}
      <div className="h-48 bg-[#141820] border-t border-slate-800 p-4">
         <div className="flex items-center gap-4 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master Sequence Monitor</span>
         </div>
         <div className="h-24 bg-black/40 rounded border border-slate-800 flex items-center justify-center text-slate-700 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />
            <Music className="w-12 h-12 opacity-5" />
            <div className="absolute top-0 bottom-0 left-[30%] w-1 bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
         </div>
      </div>
    </div>
  );
};

export default AudioPage;