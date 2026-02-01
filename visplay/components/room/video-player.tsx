"use client"

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize,
  RefreshCw,
  Youtube,
  Tv,
  Film,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLDivElement | string,
        config: {
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { target: YTPlayer; data: number }) => void
          }
        }
      ) => YTPlayer
      PlayerState: {
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        ENDED: number
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (volume: number) => void
  mute: () => void
  unMute: () => void
  getPlayerState: () => number
  destroy: () => void
}

interface VideoPlayerProps {
  videoUrl: string
  isPlaying: boolean
  currentTime: number
  onPlayPause: (playing: boolean) => void
  onSeek: (time: number) => void
  onSync: () => void
}

// Platform detection utilities
type VideoPlatform = "youtube" | "kodik" | "vk" | "rutube" | "unknown"

interface ParsedVideo {
  platform: VideoPlatform
  embedUrl: string
  videoId: string | null
}

function parseVideoUrl(url: string): ParsedVideo {
  // YouTube
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
        videoId: match[1]
      }
    }
  }

  // Kodik
  const kodikPatterns = [
    /kodik\.info\/(seria|video)\/(\d+)\/([^\/\s]+)/,
    /kodik\.(info|cc|biz)\//
  ]
  for (const pattern of kodikPatterns) {
    if (url.match(pattern)) {
      // Clean up kodik URL to embed format
      let embedUrl = url
      if (!embedUrl.includes("?")) {
        embedUrl += "?translations=false"
      }
      return {
        platform: "kodik",
        embedUrl: embedUrl,
        videoId: null
      }
    }
  }

  // VK Video
  const vkPatterns = [
    /vk\.com\/video(-?\d+)_(\d+)/,
    /vk\.com\/.*z=video(-?\d+)_(\d+)/,
    /vk\.com\/video_ext\.php\?oid=(-?\d+)&id=(\d+)/
  ]
  for (const pattern of vkPatterns) {
    const match = url.match(pattern)
    if (match) {
      const oid = match[1]
      const id = match[2]
      return {
        platform: "vk",
        embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`,
        videoId: `${oid}_${id}`
      }
    }
  }

  // Rutube
  const rutubePatterns = [
    /rutube\.ru\/video\/([a-zA-Z0-9]+)/,
    /rutube\.ru\/play\/embed\/([a-zA-Z0-9]+)/
  ]
  for (const pattern of rutubePatterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        platform: "rutube",
        embedUrl: `https://rutube.ru/play/embed/${match[1]}`,
        videoId: match[1]
      }
    }
  }

  // Unknown - try as direct embed
  if (url.includes("iframe") || url.includes("embed")) {
    // Extract src from iframe tag if provided
    const srcMatch = url.match(/src=["']([^"']+)["']/)
    if (srcMatch) {
      return {
        platform: "unknown",
        embedUrl: srcMatch[1],
        videoId: null
      }
    }
  }

  return {
    platform: "unknown",
    embedUrl: url,
    videoId: null
  }
}

function getPlatformIcon(platform: VideoPlatform) {
  switch (platform) {
    case "youtube":
      return <Youtube className="w-5 h-5" />
    case "kodik":
      return <Film className="w-5 h-5" />
    case "vk":
      return <Tv className="w-5 h-5" />
    case "rutube":
      return <Tv className="w-5 h-5" />
    default:
      return <Play className="w-5 h-5" />
  }
}

function getPlatformName(platform: VideoPlatform) {
  switch (platform) {
    case "youtube":
      return "YouTube"
    case "kodik":
      return "Kodik"
    case "vk":
      return "VK Video"
    case "rutube":
      return "Rutube"
    default:
      return "Video"
  }
}

function getPlatformColor(platform: VideoPlatform) {
  switch (platform) {
    case "youtube":
      return "text-red-500"
    case "kodik":
      return "text-orange-500"
    case "vk":
      return "text-blue-500"
    case "rutube":
      return "text-green-500"
    default:
      return "text-primary"
  }
}

// YouTube Player Component
function YouTubePlayer({
  videoId,
  isPlaying,
  currentTime,
  onPlayPause,
  onSeek,
  onSync
}: {
  videoId: string
  isPlaying: boolean
  currentTime: number
  onPlayPause: (playing: boolean) => void
  onSeek: (time: number) => void
  onSync: () => void
}) {
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [localTime, setLocalTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSyncedTimeRef = useRef<number>(0)
  const isSeekingRef = useRef(false)

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      return
    }

    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    const firstScriptTag = document.getElementsByTagName("script")[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  }, [])

  // Initialize/Update YouTube Player
  useEffect(() => {
    if (!videoId || !playerContainerRef.current) return

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }

      setIsReady(false)
      setLocalTime(0)
      setDuration(0)

      playerRef.current = new window.YT.Player(playerContainerRef.current!, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1
        },
        events: {
          onReady: (event) => {
            setIsReady(true)
            setDuration(event.target.getDuration())
            event.target.setVolume(volume)
            if (isMuted) event.target.mute()
            
            if (currentTime > 0) {
              event.target.seekTo(currentTime, true)
            }
            
            if (isPlaying) {
              event.target.playVideo()
            }
          },
          onStateChange: (event) => {
            setIsBuffering(event.data === window.YT.PlayerState.BUFFERING)
            
            if (event.target.getDuration() > 0) {
              setDuration(event.target.getDuration())
            }
          }
        }
      })
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [videoId])

  // Handle play/pause sync
  useEffect(() => {
    if (!playerRef.current || !isReady) return

    try {
      const playerState = playerRef.current.getPlayerState()
      const isCurrentlyPlaying = playerState === window.YT.PlayerState.PLAYING
      
      if (isPlaying && !isCurrentlyPlaying) {
        playerRef.current.playVideo()
      } else if (!isPlaying && isCurrentlyPlaying) {
        playerRef.current.pauseVideo()
      }
    } catch {
      // Player not ready
    }
  }, [isPlaying, isReady])

  // Handle time sync
  useEffect(() => {
    if (!playerRef.current || !isReady || isSeekingRef.current) return
    
    const timeDiff = Math.abs(currentTime - lastSyncedTimeRef.current)
    if (timeDiff > 2) {
      try {
        playerRef.current.seekTo(currentTime, true)
        setLocalTime(currentTime)
        lastSyncedTimeRef.current = currentTime
      } catch {
        // Player not ready
      }
    }
  }, [currentTime, isReady])

  // Handle volume changes
  useEffect(() => {
    if (!playerRef.current || !isReady) return
    
    try {
      playerRef.current.setVolume(volume)
      if (isMuted) {
        playerRef.current.mute()
      } else {
        playerRef.current.unMute()
      }
    } catch {
      // Player not ready
    }
  }, [volume, isMuted, isReady])

  // Track current time
  useEffect(() => {
    if (!isReady) return

    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current && !isSeekingRef.current) {
        try {
          const time = playerRef.current.getCurrentTime()
          setLocalTime(time)
        } catch {
          // Player not ready
        }
      }
    }, 500)

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current)
      }
    }
  }, [isReady])

  // Auto-hide controls
  useEffect(() => {
    const resetTimeout = () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
      setShowControls(true)
      hideControlsTimeout.current = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 3000)
    }

    resetTimeout()
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [isPlaying])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !playerRef.current || !isReady) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percent * duration
    
    isSeekingRef.current = true
    setLocalTime(newTime)
    playerRef.current.seekTo(newTime, true)
    onSeek(newTime)
    lastSyncedTimeRef.current = newTime
    
    setTimeout(() => {
      isSeekingRef.current = false
    }, 1000)
  }

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !isReady) return
    
    const newState = !isPlaying
    onPlayPause(newState)
    
    if (playerRef.current) {
      const time = playerRef.current.getCurrentTime()
      onSeek(time)
      lastSyncedTimeRef.current = time
    }
  }, [isPlaying, isReady, onPlayPause, onSeek])

  const handleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleSyncClick = () => {
    if (!playerRef.current || !isReady) return
    
    const time = playerRef.current.getCurrentTime()
    onSeek(time)
    lastSyncedTimeRef.current = time
    onSync()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-full flex flex-col bg-black"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div className="flex-1 relative">
        <div 
          ref={playerContainerRef}
          className="absolute inset-0 w-full h-full"
        />
        
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handlePlayPause}
        />

        {isBuffering && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isReady && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Loading video...</p>
            </div>
          </div>
        )}
      </div>

      <div 
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div 
          ref={progressRef}
          className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-4 group"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
            style={{ width: duration > 0 ? `${(localTime / duration) * 100}%` : "0%" }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: duration > 0 ? `calc(${(localTime / duration) * 100}% - 8px)` : "0" }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-3 rounded-full bg-primary hover:bg-primary/90 transition-colors"
              disabled={!isReady}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value))
                  setIsMuted(false)
                }}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
            </div>

            <span className="text-white/80 text-sm ml-2">
              {formatTime(localTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncClick}
              className="p-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 transition-colors"
              title="Sync all viewers to current time"
            >
              <RefreshCw className="w-4 h-4 text-primary" />
            </button>

            <button
              onClick={handleFullscreen}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Maximize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generic IFrame Player for Kodik, VK, Rutube
function IFramePlayer({
  embedUrl,
  platform,
  onSync
}: {
  embedUrl: string
  platform: VideoPlatform
  onSync: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div ref={containerRef} className="relative h-full flex flex-col bg-black">
      {/* Platform badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
        <span className={getPlatformColor(platform)}>
          {getPlatformIcon(platform)}
        </span>
        <span className="text-white text-sm font-medium">{getPlatformName(platform)}</span>
      </div>

      {/* Info banner for non-YouTube platforms */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30">
        <AlertCircle className="w-4 h-4 text-yellow-500" />
        <span className="text-yellow-200 text-xs">Use player controls</span>
      </div>

      {/* IFrame */}
      <div className="flex-1 relative">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;"
        />
      </div>

      {/* Minimal control bar */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <span className={getPlatformColor(platform)}>
              {getPlatformIcon(platform)}
            </span>
            <span>Controls synced via {getPlatformName(platform)} player</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onSync}
              className="p-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 transition-colors"
              title="Notify others to sync"
            >
              <RefreshCw className="w-4 h-4 text-primary" />
            </button>

            <button
              onClick={handleFullscreen}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Maximize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Video Player Component
export function VideoPlayer({
  videoUrl,
  isPlaying,
  currentTime,
  onPlayPause,
  onSeek,
  onSync
}: VideoPlayerProps) {
  const parsed = parseVideoUrl(videoUrl)

  if (!videoUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-background/50">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary/50 flex items-center justify-center">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-medium">No video loaded</p>
            <p className="text-muted-foreground text-sm">Search or paste a video URL above</p>
          </div>
        </div>
      </div>
    )
  }

  // Use YouTube player with full sync for YouTube videos
  if (parsed.platform === "youtube" && parsed.videoId) {
    return (
      <YouTubePlayer
        videoId={parsed.videoId}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        onSync={onSync}
      />
    )
  }

  // Use iframe player for other platforms
  return (
    <IFramePlayer
      embedUrl={parsed.embedUrl}
      platform={parsed.platform}
      onSync={onSync}
    />
  )
}
