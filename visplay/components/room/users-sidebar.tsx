"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Users, Crown, Pencil, Check, X } from "lucide-react"
import type { User } from "@/lib/room-context"

interface UsersSidebarProps {
  isOpen: boolean
  users: User[]
  currentUserId?: string
  currentUserName: string
  onNameChange: (newName: string) => void
}

export function UsersSidebar({ 
  isOpen, 
  users, 
  currentUserId, 
  currentUserName, 
  onNameChange 
}: UsersSidebarProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(currentUserName)

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== currentUserName) {
      onNameChange(editedName.trim())
    }
    setIsEditingName(false)
  }

  const handleCancelEdit = () => {
    setEditedName(currentUserName)
    setIsEditingName(false)
  }

  const handleStartEdit = () => {
    setEditedName(currentUserName)
    setIsEditingName(true)
  }

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 bottom-0 w-80 pt-16 transition-transform duration-300 z-20",
        "backdrop-blur-xl bg-sidebar/80 border-l border-sidebar-border",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-foreground font-medium">Viewers</h2>
            <p className="text-muted-foreground text-sm">{users.length} in room</p>
          </div>
        </div>

        {/* Your Name Section */}
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-2">Your display name</p>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-background/50 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                  if (e.key === "Escape") handleCancelEdit()
                }}
              />
              <button
                onClick={handleSaveName}
                className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors"
              >
                <Check className="w-4 h-4 text-primary" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{currentUserName}</span>
              <button
                onClick={handleStartEdit}
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                title="Edit name"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {users.map((user) => (
            <UserItem 
              key={user.id} 
              user={user} 
              isCurrentUser={user.id === currentUserId}
              isHost={user.isHost}
            />
          ))}
        </div>

        {/* Room Info */}
        <div className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border">
          <h3 className="text-foreground text-sm font-medium mb-2">Sync Status</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-muted-foreground text-xs">All viewers synced</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

interface UserItemProps {
  user: User
  isCurrentUser: boolean
  isHost: boolean
}

function UserItem({ user, isCurrentUser, isHost }: UserItemProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-colors",
        isCurrentUser 
          ? "bg-primary/10 border border-primary/20" 
          : "hover:bg-secondary/50"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">
          {user.avatar}
        </div>
        {/* Online indicator */}
        <div 
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar",
            user.isOnline ? "bg-green-400" : "bg-muted-foreground"
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-medium truncate">
            {user.name}
          </span>
          {isCurrentUser && (
            <span className="text-primary text-xs">(you)</span>
          )}
          {isHost && (
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
          )}
        </div>
        <span className="text-muted-foreground text-xs">
          {user.isOnline ? "Watching" : "Away"}
        </span>
      </div>
    </div>
  )
}
