"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatedBackground } from "@/components/animated-background"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ArrowRight } from "lucide-react"

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 4)
}

export default function HomePage() {
  const router = useRouter()
  const [roomLink, setRoomLink] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleCreateRoom = () => {
    setIsCreating(true)
    const roomId = generateRoomId()
    router.push(`/room/${roomId}`)
  }

  const handleJoinRoom = () => {
    if (!roomLink.trim()) return
    setIsJoining(true)
    
    // Extract room ID from full URL or use as-is
    let roomId = roomLink.trim()
    if (roomId.includes("/room/")) {
      roomId = roomId.split("/room/")[1].split("?")[0]
    }
    
    router.push(`/room/${roomId}`)
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Logo size="lg" />
        </div>
        
        {/* Main Card */}
        <div className="backdrop-blur-xl bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-primary/10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-foreground mb-2">
              Watch Together
            </h1>
            <p className="text-muted-foreground text-sm">
              Create a room or join an existing one to watch videos in sync
            </p>
          </div>
          
          {/* Create Room Button */}
          <Button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl mb-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
          
          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          {/* Join Room Section */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Paste room link or ID"
                value={roomLink}
                onChange={(e) => setRoomLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                className="w-full h-14 bg-input border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
              />
            </div>
            <Button
              onClick={handleJoinRoom}
              disabled={!roomLink.trim() || isJoining}
              variant="secondary"
              className="w-full h-12 text-base font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-all duration-300 disabled:opacity-50"
            >
              {isJoining ? "Joining..." : "Join Room"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
        
        {/* Footer Text */}
        <p className="text-center text-muted-foreground/60 text-xs mt-8">
          No sign up required. Share the link and start watching.
        </p>
      </div>
    </main>
  )
}
