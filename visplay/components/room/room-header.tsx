"use client"

import { useState } from "react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Copy, Check, Share2, Users, Settings, PanelRightClose, PanelRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface RoomHeaderProps {
  roomId: string
  userCount: number
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export function RoomHeader({ roomId, userCount, onToggleSidebar, isSidebarOpen }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)
  
  const roomUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/room/${roomId}` 
    : `/room/${roomId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my viplay room",
          text: "Watch videos together with me!",
          url: roomUrl
        })
      } catch (err) {
        // User cancelled or share failed
        handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3 backdrop-blur-xl bg-card/50 border-b border-border">
      <div className="flex items-center gap-4">
        <Logo size="sm" clickable />
        
        {/* Room ID Display */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
          <span className="text-muted-foreground text-xs">Room:</span>
          <code className="text-foreground text-sm font-mono">{roomId}</code>
          <button
            onClick={handleCopy}
            className="ml-1 p-1 rounded hover:bg-primary/20 transition-colors"
            title="Copy room link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* User Count Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-foreground text-sm font-medium">{userCount}</span>
        </div>

        {/* Share Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="h-9 w-9 rounded-lg hover:bg-primary/20"
          title="Share room"
        >
          <Share2 className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-primary/20"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className={cn(
            "h-9 w-9 rounded-lg hover:bg-primary/20",
            isSidebarOpen && "bg-primary/10"
          )}
          title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {isSidebarOpen ? (
            <PanelRightClose className="w-4 h-4 text-muted-foreground" />
          ) : (
            <PanelRight className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </header>
  )
}
