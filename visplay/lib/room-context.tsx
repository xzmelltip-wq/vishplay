"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface User {
  id: string
  name: string
  avatar: string
  isOnline: boolean
  isHost: boolean
  joinedAt: Date
}

interface RoomAction {
  user: string
  action: string
  timestamp: Date
}

interface RoomState {
  video_url: string
  is_playing: boolean
  playback_time: number
}

// Player action types for broadcasting
export interface PlayerAction {
  type: "play" | "pause" | "seek" | "time-update" | "request-sync"
  timestamp: number
  userId: string
  userName: string
  userAvatar: string
  platform: string
}

// Notification for displaying player actions
export interface PlayerNotification {
  id: string
  type: "play" | "pause" | "seek" | "sync"
  userName: string
  userAvatar: string
  timestamp: number
  createdAt: Date
}

interface RoomContextType {
  roomId: string
  videoUrl: string
  setVideoUrl: (url: string) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  currentTime: number
  setCurrentTime: (time: number) => void
  syncTime: (time: number) => void
  forceSync: () => void
  users: User[]
  currentUser: User | null
  lastAction: RoomAction | null
  triggerAction: (user: string, action: string) => void
  updateUserName: (newName: string) => void
  isHost: boolean
  // New broadcast functions
  broadcastPlayerAction: (action: PlayerAction) => void
  notifications: PlayerNotification[]
  dismissNotification: (id: string) => void
  otherUsersTime: { userId: string; userName: string; timestamp: number } | null
  requestSyncFromHost: () => void
}

const RoomContext = createContext<RoomContextType | null>(null)

const AVATARS = [
  "🟣", "🔵", "🟢", "🟡", "🟠", "🔴", "⚪", "🟤"
]

const NAMES = [
  "Cosmic Fox", "Neon Wolf", "Digital Bear", "Cyber Cat", 
  "Quantum Owl", "Pixel Hawk", "Void Tiger", "Star Raven"
]

function generateUser(isHost: boolean = false): User {
  return {
    id: Math.random().toString(36).substring(2, 10),
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    isOnline: true,
    isHost,
    joinedAt: new Date()
  }
}

interface RoomProviderProps {
  children: ReactNode
  roomId: string
}

export function RoomProvider({ children, roomId }: RoomProviderProps) {
  const [videoUrl, setVideoUrlState] = useState("")
  const [isPlaying, setIsPlayingState] = useState(false)
  const [currentTime, setCurrentTimeState] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [lastAction, setLastAction] = useState<RoomAction | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [notifications, setNotifications] = useState<PlayerNotification[]>([])
  const [otherUsersTime, setOtherUsersTime] = useState<{ userId: string; userName: string; timestamp: number } | null>(null)
  
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isInitializedRef = useRef(false)
  const skipNextUpdateRef = useRef(false)
  const currentUserRef = useRef<User | null>(null)

  // Keep currentUserRef in sync
  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  // Auto-dismiss notifications after 4 seconds
  useEffect(() => {
    if (notifications.length === 0) return

    const timer = setTimeout(() => {
      setNotifications(prev => {
        if (prev.length === 0) return prev
        return prev.slice(1)
      })
    }, 4000)

    return () => clearTimeout(timer)
  }, [notifications])

  // Initialize room and subscribe to realtime updates
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    async function initRoom() {
      // Check if room exists
      const { data: existingRoom } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single()

      let roomIsHost = false

      if (!existingRoom) {
        roomIsHost = true
        await supabase.from("rooms").insert({
          id: roomId,
          video_url: "",
          is_playing: false,
          playback_time: 0
        })
      } else {
        setVideoUrlState(existingRoom.video_url || "")
        setIsPlayingState(existingRoom.is_playing || false)
        setCurrentTimeState(existingRoom.playback_time || 0)
      }

      setIsHost(roomIsHost)

      const user = generateUser(roomIsHost)
      setCurrentUser(user)
      currentUserRef.current = user

      await supabase.from("room_users").insert({
        room_id: roomId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar,
        is_host: roomIsHost
      })

      const { data: existingUsers } = await supabase
        .from("room_users")
        .select("*")
        .eq("room_id", roomId)

      if (existingUsers) {
        setUsers(existingUsers.map(u => ({
          id: u.user_id,
          name: u.user_name,
          avatar: u.user_avatar,
          isOnline: true,
          isHost: u.is_host,
          joinedAt: new Date(u.joined_at)
        })))
      }

      // Subscribe to room changes and broadcasts
      const channel = supabase
        .channel(`room:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${roomId}`
          },
          (payload) => {
            if (skipNextUpdateRef.current) {
              skipNextUpdateRef.current = false
              return
            }
            const newState = payload.new as RoomState
            setVideoUrlState(newState.video_url || "")
            setIsPlayingState(newState.is_playing || false)
            setCurrentTimeState(newState.playback_time || 0)
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "room_users",
            filter: `room_id=eq.${roomId}`
          },
          (payload) => {
            const newUser = payload.new as { user_id: string; user_name: string; user_avatar: string; is_host: boolean; joined_at: string }
            setUsers(prev => {
              if (prev.find(u => u.id === newUser.user_id)) return prev
              return [...prev, {
                id: newUser.user_id,
                name: newUser.user_name,
                avatar: newUser.user_avatar,
                isOnline: true,
                isHost: newUser.is_host,
                joinedAt: new Date(newUser.joined_at)
              }]
            })
            setLastAction({
              user: newUser.user_name,
              action: "joined the room",
              timestamp: new Date()
            })
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "room_users",
            filter: `room_id=eq.${roomId}`
          },
          (payload) => {
            const updatedUser = payload.new as { user_id: string; user_name: string; user_avatar: string; is_host: boolean }
            setUsers(prev => prev.map(u => 
              u.id === updatedUser.user_id 
                ? { ...u, name: updatedUser.user_name, avatar: updatedUser.user_avatar }
                : u
            ))
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "room_users",
            filter: `room_id=eq.${roomId}`
          },
          (payload) => {
            const oldUser = payload.old as { user_id: string; user_name: string }
            setUsers(prev => prev.filter(u => u.id !== oldUser.user_id))
            if (oldUser.user_name) {
              setLastAction({
                user: oldUser.user_name,
                action: "left the room",
                timestamp: new Date()
              })
            }
          }
        )
        // Listen for player action broadcasts
        .on(
          "broadcast",
          { event: "player-action" },
          (payload) => {
            const action = payload.payload as PlayerAction
            
            // Don't process own actions
            if (action.userId === currentUserRef.current?.id) return

            // Handle different action types
            if (action.type === "play" || action.type === "pause" || action.type === "seek") {
              // Add notification
              const notification: PlayerNotification = {
                id: Math.random().toString(36).substring(2, 10),
                type: action.type,
                userName: action.userName,
                userAvatar: action.userAvatar,
                timestamp: action.timestamp,
                createdAt: new Date()
              }
              setNotifications(prev => [...prev.slice(-4), notification])

              // Update state based on action
              if (action.type === "play") {
                setIsPlayingState(true)
                setCurrentTimeState(action.timestamp)
              } else if (action.type === "pause") {
                setIsPlayingState(false)
                setCurrentTimeState(action.timestamp)
              } else if (action.type === "seek") {
                setCurrentTimeState(action.timestamp)
              }
            } else if (action.type === "time-update") {
              // Track other user's time for sync detection
              setOtherUsersTime({
                userId: action.userId,
                userName: action.userName,
                timestamp: action.timestamp
              })
            } else if (action.type === "request-sync") {
              // New user requesting sync - if we're host, send current state
              // This is handled by the host automatically responding
            }
          }
        )
        .subscribe()

      channelRef.current = channel

      // If not host, request sync from existing users
      if (!roomIsHost) {
        setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: "player-action",
            payload: {
              type: "request-sync",
              timestamp: 0,
              userId: user.id,
              userName: user.name,
              userAvatar: user.avatar,
              platform: ""
            }
          })
        }, 1000)
      }
    }

    initRoom()

    return () => {
      if (currentUserRef.current) {
        supabase.from("room_users").delete().eq("user_id", currentUserRef.current.id)
      }
      channelRef.current?.unsubscribe()
    }
  }, [roomId, supabase])

  // Broadcast player action
  const broadcastPlayerAction = useCallback((action: PlayerAction) => {
    if (!channelRef.current) return
    
    channelRef.current.send({
      type: "broadcast",
      event: "player-action",
      payload: action
    })
  }, [])

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Request sync from host
  const requestSyncFromHost = useCallback(() => {
    if (!currentUser || !channelRef.current) return

    channelRef.current.send({
      type: "broadcast",
      event: "player-action",
      payload: {
        type: "request-sync",
        timestamp: 0,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        platform: ""
      }
    })
  }, [currentUser])

  // Sync video URL to database
  const setVideoUrl = useCallback(async (url: string) => {
    setVideoUrlState(url)
    skipNextUpdateRef.current = true
    await supabase
      .from("rooms")
      .update({ video_url: url, updated_at: new Date().toISOString() })
      .eq("id", roomId)
    
    if (currentUser) {
      setLastAction({
        user: currentUser.name,
        action: "changed the video",
        timestamp: new Date()
      })
    }
  }, [roomId, supabase, currentUser])

  // Sync play state to database
  const setIsPlaying = useCallback(async (playing: boolean) => {
    setIsPlayingState(playing)
    skipNextUpdateRef.current = true
    await supabase
      .from("rooms")
      .update({ is_playing: playing, updated_at: new Date().toISOString() })
      .eq("id", roomId)
    
    if (currentUser) {
      setLastAction({
        user: currentUser.name,
        action: playing ? "started playback" : "paused playback",
        timestamp: new Date()
      })
      
      // Broadcast action
      broadcastPlayerAction({
        type: playing ? "play" : "pause",
        timestamp: currentTime,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        platform: "sync"
      })
    }
  }, [roomId, supabase, currentUser, currentTime, broadcastPlayerAction])

  // Local time update
  const setCurrentTime = useCallback((time: number) => {
    setCurrentTimeState(time)
  }, [])

  // Sync time to database
  const syncTime = useCallback(async (time: number) => {
    setCurrentTimeState(time)
    skipNextUpdateRef.current = true
    await supabase
      .from("rooms")
      .update({ playback_time: time, updated_at: new Date().toISOString() })
      .eq("id", roomId)
    
    if (currentUser) {
      setLastAction({
        user: currentUser.name,
        action: "seeked the video",
        timestamp: new Date()
      })
      
      // Broadcast seek action
      broadcastPlayerAction({
        type: "seek",
        timestamp: time,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        platform: "sync"
      })
    }
  }, [roomId, supabase, currentUser, broadcastPlayerAction])

  // Force sync
  const forceSync = useCallback(async () => {
    if (!currentUser) return

    // Broadcast current time to everyone
    broadcastPlayerAction({
      type: "seek",
      timestamp: currentTime,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      platform: "sync"
    })

    // Add notification that sync was requested
    const notification: PlayerNotification = {
      id: Math.random().toString(36).substring(2, 10),
      type: "sync",
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      timestamp: currentTime,
      createdAt: new Date()
    }
    setNotifications(prev => [...prev.slice(-4), notification])
    
    setLastAction({
      user: currentUser.name,
      action: "synced everyone",
      timestamp: new Date()
    })
  }, [currentUser, currentTime, broadcastPlayerAction])

  // Update user name
  const updateUserName = useCallback(async (newName: string) => {
    if (!currentUser) return
    
    await supabase
      .from("room_users")
      .update({ user_name: newName })
      .eq("user_id", currentUser.id)
    
    setCurrentUser(prev => prev ? { ...prev, name: newName } : null)
    setUsers(prev => prev.map(u => 
      u.id === currentUser.id ? { ...u, name: newName } : u
    ))
    
    setLastAction({
      user: newName,
      action: "changed their name",
      timestamp: new Date()
    })
  }, [currentUser, supabase])

  const triggerAction = useCallback((user: string, action: string) => {
    setLastAction({
      user,
      action,
      timestamp: new Date()
    })
  }, [])

  return (
    <RoomContext.Provider value={{
      roomId,
      videoUrl,
      setVideoUrl,
      isPlaying,
      setIsPlaying,
      currentTime,
      setCurrentTime,
      syncTime,
      forceSync,
      users,
      currentUser,
      lastAction,
      triggerAction,
      updateUserName,
      isHost,
      broadcastPlayerAction,
      notifications,
      dismissNotification,
      otherUsersTime,
      requestSyncFromHost
    }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider")
  }
  return context
}
