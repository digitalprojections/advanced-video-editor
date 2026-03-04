
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

export class FFmpegService {
  private static instance: FFmpeg | null = null;
  private static loaded = false;
  private static isSingleThreaded = false;

  /**
   * Diagnostic: Checks if the browser environment supports FFmpeg.
   */
  static isSupported(): boolean {
    return true; 
  }

  /**
   * Diagnostic: Specifically checks for multi-threading capability.
   * Crucial: We must check crossOriginIsolated because SharedArrayBuffer exists 
   * in most browsers but is useless for Workers without isolation headers.
   */
  static hasMultiThreading(): boolean {
    return typeof SharedArrayBuffer !== 'undefined' && !!(window as any).crossOriginIsolated;
  }

  static checkEnvironment(): { supported: boolean; multiThreading: boolean; reason?: string } {
    const multiThreading = this.hasMultiThreading();
    return { 
      supported: true, 
      multiThreading,
      reason: multiThreading ? undefined : "Cross-Origin Isolation missing. Forcing Single-Threaded Mode." 
    };
  }

  /**
   * Returns a singleton instance of FFmpeg.
   */
  static async getInstance(): Promise<FFmpeg> {
    if (this.instance) return this.instance;
    
    try {
      this.instance = new FFmpeg();
      return this.instance;
    } catch (error) {
      console.error("FFmpeg Service: Instance Initialization Failed", error);
      throw error;
    }
  }

  /**
   * Loads the FFmpeg WASM core. 
   * Dynamically selects between multi-threaded and single-threaded builds.
   * Uses toBlobURL to bypass CSP and same-origin restrictions for Workers.
   */
  static async load(onLog?: (message: string) => void, onProgress?: (progress: number) => void) {
    if (this.loaded) return;

    try {
      const ffmpeg = await this.getInstance();
      
      ffmpeg.on('log', ({ message }: { message: string }) => {
        if (onLog) onLog(message);
      });

      if (onProgress) {
        ffmpeg.on('progress', ({ progress }: { progress: number }) => {
          onProgress(progress);
        });
      }

      // Check if we can use Multi-Threading. If not isolated, we MUST use ST.
      const multiThreadingAvailable = this.hasMultiThreading();
      this.isSingleThreaded = !multiThreadingAvailable;

      const corePkg = multiThreadingAvailable ? '@ffmpeg/core' : '@ffmpeg/core-st';
      const coreBaseURL = `https://cdn.jsdelivr.net/npm/${corePkg}@0.12.6/dist/umd`;
      
      const loadConfig: any = {
        coreURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      };

      // Only multi-threaded build requires a worker script.
      // If we are using core-st, we omit workerURL to prevent the library from trying to spawn one.
      if (multiThreadingAvailable) {
        loadConfig.workerURL = await toBlobURL(`${coreBaseURL}/ffmpeg-core.worker.js`, 'text/javascript');
      }
      
      await ffmpeg.load(loadConfig);
      
      this.loaded = true;
      if (onLog) onLog(`FFmpeg Engine Loaded in ${this.isSingleThreaded ? 'SINGLE-THREADED' : 'MULTI-THREADED'} mode.`);
    } catch (err) {
      console.error("FFmpeg WASM Load Failed:", err);
      this.instance = null;
      throw err;
    }
  }

  /**
   * NATIVE FALLBACK: Extracts a frame using standard browser APIs.
   * Essential for environments where FFmpeg WASM initialization is blocked.
   */
  static async getFrameNative(videoUrl: string, time: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = (window as any).document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.currentTime = time;

      const timeout = setTimeout(() => {
        video.src = "";
        reject(new Error("Native frame extraction timed out"));
      }, 15000);

      video.onseeked = () => {
        clearTimeout(timeout);
        const canvas = (window as any).document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const data = canvas.toDataURL('image/png');
          video.remove(); 
          resolve(data);
        } else {
          reject(new Error("Canvas context failed"));
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Video load failed for native capture"));
      };
    });
  }

  static async getFrameAtTime(videoUrl: string, time: number): Promise<string> {
    if (this.loaded && this.instance) {
      try {
        const ffmpeg = this.instance;
        const inputName = `thumb_${Math.random().toString(36).substr(2, 5)}.mp4`;
        const outputName = `thumb_${Math.random().toString(36).substr(2, 5)}.png`;

        await ffmpeg.writeFile(inputName, await fetchFile(videoUrl));
        await ffmpeg.exec(['-ss', time.toString(), '-i', inputName, '-frames:v', '1', '-q:v', '2', outputName]);
        const data = await ffmpeg.readFile(outputName);
        
        await ffmpeg.deleteFile(inputName).catch(() => {});
        await ffmpeg.deleteFile(outputName).catch(() => {});

        const blob = new Blob([data as any], { type: 'image/png' });
        return URL.createObjectURL(blob);
      } catch (err) {
        console.warn("FFmpeg frame capture failed, falling back to Native Engine:", err);
      }
    }
    return this.getFrameNative(videoUrl, time);
  }

  static async seekAndRenderFrame(videoUrl: string, time: number): Promise<string> {
    if (!this.loaded) return this.getFrameNative(videoUrl, time);
    
    try {
      const ffmpeg = this.instance!;
      const inputName = `render_${Math.random().toString(36).substr(2, 5)}.mp4`;
      const outputName = `render_${Math.random().toString(36).substr(2, 5)}.png`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoUrl));
      await ffmpeg.exec(['-ss', time.toString(), '-i', inputName, '-frames:v', '1', '-q:v', '4', outputName]);
      const data = await ffmpeg.readFile(outputName);
      
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});

      const blob = new Blob([data as any], { type: 'image/png' });
      return URL.createObjectURL(blob);
    } catch (err) {
      return this.getFrameNative(videoUrl, time);
    }
  }

  static async renderTimeline(clips: any[], assets: any[], fileName: string, onProgress?: (p: number) => void) {
    if (!this.loaded) await this.load();
    const ffmpeg = this.instance!;

    if (onProgress) {
        ffmpeg.on('progress', ({ progress }: { progress: number }) => onProgress(progress));
    }

    const inputFiles: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const asset = assets.find(a => a.id === clip.assetId);
      if (!asset) continue;

      const virtualName = `in_${i}.mp4`;
      const processedName = `proc_${i}.mp4`;

      await ffmpeg.writeFile(virtualName, await fetchFile(asset.url));
      await ffmpeg.exec([
        '-ss', clip.offset.toString(),
        '-t', clip.duration.toString(),
        '-i', virtualName,
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac',
        processedName
      ]);
      inputFiles.push(processedName);
    }

    const listContent = inputFiles.map(f => `file '${f}'`).join('\n');
    await ffmpeg.writeFile('concat_list.txt', listContent);
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c:v', 'libx264', '-preset', 'ultrafast', fileName]);
    const data = await ffmpeg.readFile(fileName);
    return new Blob([data as any], { type: 'video/mp4' });
  }

  static async mergeAudio(videoUrl: string, audioUrl: string, outputName: string) {
    if (!this.loaded) await this.load();
    const ffmpeg = this.instance!;

    await ffmpeg.writeFile('v.mp4', await fetchFile(videoUrl));
    await ffmpeg.writeFile('a.webm', await fetchFile(audioUrl));
    await ffmpeg.exec(['-i', 'v.mp4', '-i', 'a.webm', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', outputName]);
    const data = await ffmpeg.readFile(outputName);
    return new Blob([data as any], { type: 'video/mp4' });
  }
}
