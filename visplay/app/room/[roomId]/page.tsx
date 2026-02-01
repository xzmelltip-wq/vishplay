"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { RoomHeader } from "@/components/room/room-header"
import { VideoSection } from "@/components/room/video-section"
import { UsersSidebar } from "@/components/room/users-sidebar"
import { AnimatedBackground } from "@/components/animated-background"
import { RoomProvider, useRoom } from "@/lib/room-context"

function RoomContent({ roomId }: { roomId: string }) {
  const { 
    videoUrl, 
    setVideoUrl, 
    isPlaying, 
    setIsPlaying, 
    currentTime, 
    syncTime,
    forceSync,
    users,
    currentUser,
    updateUserName
  } = useRoom()

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleVideoLoad = useCallback((url: string) => {
    setVideoUrl(url)
  }, [setVideoUrl])

  const handlePlayPause = useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [setIsPlaying])

  const handleSeek = useCallback((time: number) => {
    syncTime(time)
  }, [syncTime])

  const handleSync = useCallback(() => {
    forceSync()
  }, [forceSync])

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground />
      
      <div className="relative z-10 flex flex-col h-screen">
        <RoomHeader 
          roomId={roomId} 
          userCount={users.length}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        
        <div className="flex-1 flex overflow-hidden">
          <VideoSection
            videoUrl={videoUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onVideoLoad={handleVideoLoad}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSync={handleSync}
            className={isSidebarOpen ? "mr-0 lg:mr-80" : ""}
          />
          
          <UsersSidebar 
            isOpen={isSidebarOpen}
            users={users}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.name || ""}
            onNameChange={updateUserName}
          />
        </div>
      </div>
    </div>
  )
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>()
  const roomId = params.roomId
  
  if (!roomId) {
    return null
  }
  
  return (
    <RoomProvider roomId={roomId}>
      <RoomContent roomId={roomId} />
    </RoomProvider>
  )
}
