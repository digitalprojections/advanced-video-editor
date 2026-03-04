
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */

export enum WorkspacePage {
  MEDIA = 'MEDIA',
  CUT = 'CUT',
  EDIT = 'EDIT',
  AUDIO = 'AUDIO',
  DELIVER = 'DELIVER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface VideoAsset {
  id: string;
  name: string;
  url: string;
  duration: number; // in seconds
  thumbnail: string;
  type: 'video' | 'audio';
  status: 'processing' | 'ready' | 'error';
  width?: number;
  height?: number;
}

export interface TimelineClip {
  id: string;
  assetId: string;
  startTime: number; // Position on timeline in seconds
  duration: number; // Duration of clip on timeline
  offset: number; // Offset into the source asset
  layer: number;
  transition?: 'fade' | 'slide' | 'none';
}

export interface ProjectState {
  assets: VideoAsset[];
  timeline: TimelineClip[];
  currentTime: number;
  isPlaying: boolean;
  activeWorkspace: WorkspacePage;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  dataUrl: string;
  assetName: string;
}
