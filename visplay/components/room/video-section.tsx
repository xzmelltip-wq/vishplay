"use client"

import { useState, useRef, useEffect } from "react"
import { VideoSearchBar } from "./video-search-bar"
import { VideoPlayer } from "./video-player"
import { cn } from "@/lib/utils"
import { Play, Link2 } from "lucide-react"

interface VideoSectionProps {
  videoUrl: string
  isPlaying: boolean
  currentTime: number
  onVideoLoad: (url: string) => void
  onPlayPause: (playing: boolean) => void
  onSeek: (time: number) => void
  onSync: () => void
  className?: string
}

export function VideoSection({
  videoUrl,
  isPlaying,
  currentTime,
  onVideoLoad,
  onPlayPause,
  onSeek,
  onSync,
  className
}: VideoSectionProps) {
  return (
    <main className={cn("flex-1 flex flex-col p-4 lg:p-6 transition-all duration-300", className)}>
      {/* Video Search Bar */}
      <VideoSearchBar onVideoLoad={onVideoLoad} />
      
      {/* Video Player Container */}
      <div className="flex-1 mt-4 rounded-2xl overflow-hidden backdrop-blur-xl bg-card/30 border border-border">
        {videoUrl ? (
          <VideoPlayer
            videoUrl={videoUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlayPause={onPlayPause}
            onSeek={onSeek}
            onSync={onSync}
          />
        ) : (
          <EmptyVideoState />
        )}
      </div>
    </main>
  )
}

function EmptyVideoState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Play className="w-8 h-8 text-primary ml-1" />
      </div>
      <h3 className="text-xl font-medium text-foreground mb-2">No video loaded</h3>
      <p className="text-muted-foreground text-sm max-w-md">
        Search for a YouTube video or paste a URL above to start watching together
      </p>
      <div className="flex items-center gap-2 mt-6 text-muted-foreground/60 text-xs">
        <Link2 className="w-4 h-4" />
        <span>Supports YouTube, Vimeo, and direct video links</span>
      </div>
    </div>
  )
}
