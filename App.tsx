
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Scissors, 
  Layout, 
  Music, 
  Share2, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Camera, 
  Plus, 
  Monitor,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { WorkspacePage, VideoAsset, TimelineClip, Snapshot, User } from './types';
import MediaPage from './components/Media/MediaPage';
import EditPage from './components/Edit/EditPage';
import AudioPage from './components/Audio/AudioPage';
import CutPage from './components/Cut/CutPage';
import DeliverPage from './components/Deliver/DeliverPage';
import GoogleLogin from './components/Auth/GoogleLogin';

const App: React.FC = () => {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  
  // Application Workspace State
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspacePage>(WorkspacePage.EDIT);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  
  // Refs for video playback engine
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(null);

  /**
   * Playhead Loop: Drives the playhead based on real time
   * This allows the playhead to move even when no video asset is present (empty timeline space)
   */
  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      setCurrentTime(prev => prev + deltaTime);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  /**
   * Global Keyboard Shortcuts
   */
  useEffect(() => {
    // @ts-ignore - keyboard event might have missing definitions in this environment
    const handleKeyDown = (e: any) => {
      // Ignore shortcut if user is typing in an input or textarea
      // @ts-ignore - Accessing target via any to avoid missing property errors in restrictive TS environments
      const target = e.target as any;
      // @ts-ignore - Accessing tagName and isContentEditable via any casting to avoid type mismatch
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // @ts-ignore - Accessing code via any to avoid missing property errors in restrictive TS environments
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
      }
    };

    // @ts-ignore - Accessing window via any to avoid missing method errors in restrictive TS environments
    (window as any).addEventListener('keydown', handleKeyDown);
    // @ts-ignore - Accessing window via any to avoid missing method errors in restrictive TS environments
    return () => (window as any).removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency since togglePlayback is now stable via functional updates

  /**
   * Determines which clip is currently under the playhead.
   */
  const activeClip = timeline.find(clip => 
    currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration
  );
  
  const activeAsset = activeClip ? assets.find(a => a.id === activeClip.assetId) : null;

  /**
   * Effect: Handles Play/Pause sync for the actual HTMLVideoElement.
   */
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        // @ts-ignore
        (videoRef.current as any).play().catch(() => {
          // Ignore play interruptions (e.g. rapid switching)
        });
      } else {
        // @ts-ignore
        (videoRef.current as any).pause();
      }
    }
  }, [isPlaying, activeAsset]);

  /**
   * Effect: Syncs the Video Element's playhead position with the global currentTime state.
   */
  useEffect(() => {
    if (videoRef.current && activeClip) {
      const localTime = (currentTime - activeClip.startTime) + activeClip.offset;
      // @ts-ignore
      if (Math.abs((videoRef.current as any).currentTime - localTime) > 0.05) {
        // @ts-ignore
        (videoRef.current as any).currentTime = localTime;
      }
    }
  }, [currentTime, activeClip]);

  const togglePlayback = () => setIsPlaying(prev => !prev);

  /**
   * Captures a still frame from the current video at the playhead position.
   */
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    // @ts-ignore
    const canvas = (window as any).document.createElement('canvas');
    // @ts-ignore
    canvas.width = (videoRef.current as any).videoWidth;
    // @ts-ignore
    canvas.height = (videoRef.current as any).videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const newSnapshot: Snapshot = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: currentTime,
        dataUrl,
        assetName: 'Frame Capture'
      };
      setSnapshots(prev => [newSnapshot, ...prev]);
    }
  };

  const addAsset = (newAsset: VideoAsset) => setAssets(prev => [...prev, newAsset]);
  const updateAsset = (id: string, updates: Partial<VideoAsset>) => setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));

  const addToTimeline = (asset: VideoAsset) => {
    const lastClip = timeline[timeline.length - 1];
    const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
    const newClip: TimelineClip = {
      id: Math.random().toString(36).substr(2, 9),
      assetId: asset.id,
      startTime,
      duration: asset.duration,
      offset: 0,
      layer: 1
    };
    setTimeline(prev => [...prev, newClip]);
  };

  const addClipAtTime = (assetId: string, startTime: number) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    // Check for overlap at drop location (Layer 1 restricted)
    const overlap = timeline.find(c => 
      c.layer === 1 && 
      ((startTime >= c.startTime && startTime < c.startTime + c.duration) || 
       (startTime + asset.duration > c.startTime && startTime + asset.duration <= c.startTime + c.duration))
    );
    
    if (overlap) return; // Prevent overlapping on drop

    const newClip: TimelineClip = {
      id: Math.random().toString(36).substr(2, 9),
      assetId: asset.id,
      startTime,
      duration: asset.duration,
      offset: 0,
      layer: 1
    };
    setTimeline(prev => [...prev, newClip]);
  };

  const updateClip = (clipId: string, updates: Partial<TimelineClip>) => {
    setTimeline(prev => prev.map(clip => clip.id === clipId ? { ...clip, ...updates } : clip));
  };

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0b0e14] flex flex-col items-center justify-center p-4">
        <GoogleLogin onLoginSuccess={setUser} onLoginFailure={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b0e14] text-slate-300 select-none">
      <nav className="flex items-center justify-between px-4 py-2 bg-[#1c212b] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-600 rounded">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">GEMINI RESOLVE</span>
        </div>
        
        <div className="flex gap-1">
          {[
            { id: WorkspacePage.MEDIA, icon: Layout, label: 'Media' },
            { id: WorkspacePage.CUT, icon: Scissors, label: 'Cut' },
            { id: WorkspacePage.EDIT, icon: Film, label: 'Edit' },
            { id: WorkspacePage.AUDIO, icon: Music, label: 'Audio' },
            { id: WorkspacePage.DELIVER, icon: Share2, label: 'Deliver' },
          ].map((page) => (
            <button
              key={page.id}
              onClick={() => setActiveWorkspace(page.id)}
              className={`flex flex-col items-center px-4 py-1 rounded transition-colors ${
                activeWorkspace === page.id ? 'bg-[#2d333f] text-orange-500' : 'hover:bg-[#2d333f]'
              }`}
            >
              <page.icon className="w-5 h-5" />
              <span className="text-[10px] uppercase font-semibold mt-1">{page.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-xs font-mono text-orange-400 bg-black/40 px-2 py-1 rounded">
            {new Date(currentTime * 1000).toISOString().substr(11, 11)}
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
             <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-white uppercase">{user.name}</div>
                <div className="text-[9px] text-slate-500">{user.email}</div>
             </div>
             <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
          </div>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {activeWorkspace === WorkspacePage.MEDIA && <MediaPage assets={assets} onAddAsset={addAsset} onUpdateAsset={updateAsset} onAddToTimeline={addToTimeline} />}
        {activeWorkspace === WorkspacePage.CUT && <CutPage assets={assets} timeline={timeline} currentTime={currentTime} setCurrentTime={setCurrentTime} />}
        {activeWorkspace === WorkspacePage.EDIT && (
          <EditPage 
            assets={assets} 
            timeline={timeline} 
            setTimeline={setTimeline}
            currentTime={currentTime} 
            setCurrentTime={setCurrentTime} 
            isPlaying={isPlaying}
            togglePlayback={togglePlayback}
            takeSnapshot={takeSnapshot}
            videoRef={videoRef}
            activeAsset={activeAsset}
            onTimeUpdate={() => {}}
            onAddClipAtTime={addClipAtTime}
            onUpdateClip={updateClip}
            snapshots={snapshots}
          />
        )}
        {activeWorkspace === WorkspacePage.AUDIO && <AudioPage assets={assets} timeline={timeline} />}
        {activeWorkspace === WorkspacePage.DELIVER && <DeliverPage timeline={timeline} assets={assets} />}
      </main>

      <footer className="h-6 bg-[#1c212b] border-t border-slate-800 flex items-center justify-between px-4 text-[10px] uppercase font-medium">
        <div className="flex gap-4">
          <span className="text-slate-500">Project: <span className="text-slate-300 underline">Untitled_Project_01</span></span>
        </div>
        <div className="flex gap-4">
          <span className="text-green-500">● GPU Acceleration Active</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
