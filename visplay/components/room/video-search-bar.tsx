"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Link2, Loader2, X, ExternalLink, Youtube, Tv, Film } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoSearchBarProps {
  onVideoLoad: (url: string) => void
}

interface SearchResult {
  id: string
  title: string
  thumbnail: string
  channel: string
  duration: string
}

// Detect video platform from URL
type VideoPlatform = "youtube" | "kodik" | "vk" | "rutube" | "unknown" | null

function detectPlatform(url: string): VideoPlatform {
  if (!url.trim()) return null
  
  // YouTube
  if (url.match(/(?:youtube\.com|youtu\.be)/i)) {
    return "youtube"
  }
  
  // Kodik
  if (url.match(/kodik\.(info|cc|biz)/i) || url.match(/yummyani\.me/i) || url.match(/animego\./i)) {
    return "kodik"
  }
  
  // VK
  if (url.match(/vk\.com.*video/i)) {
    return "vk"
  }
  
  // Rutube
  if (url.match(/rutube\.ru/i)) {
    return "rutube"
  }
  
  // Check for iframe src
  if (url.includes("<iframe") || url.includes("embed")) {
    return "unknown"
  }
  
  return null
}

function getPlatformInfo(platform: VideoPlatform) {
  switch (platform) {
    case "youtube":
      return { name: "YouTube", icon: Youtube, color: "text-red-500", bg: "bg-red-500/10" }
    case "kodik":
      return { name: "Kodik", icon: Film, color: "text-orange-500", bg: "bg-orange-500/10" }
    case "vk":
      return { name: "VK Video", icon: Tv, color: "text-blue-500", bg: "bg-blue-500/10" }
    case "rutube":
      return { name: "Rutube", icon: Tv, color: "text-green-500", bg: "bg-green-500/10" }
    case "unknown":
      return { name: "Video", icon: Link2, color: "text-primary", bg: "bg-primary/10" }
    default:
      return null
  }
}

// Sample search results for demo
const SAMPLE_RESULTS: SearchResult[] = [
  {
    id: "jfKfPfyJRdk",
    title: "lofi hip hop radio - beats to relax/study to",
    thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg",
    channel: "Lofi Girl",
    duration: "LIVE"
  },
  {
    id: "5qap5aO4i9A",
    title: "lofi hip hop radio - beats to sleep/chill to",
    thumbnail: "https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg",
    channel: "Lofi Girl",
    duration: "LIVE"
  },
  {
    id: "DWcJFNfaw9c",
    title: "Chillhop Radio - jazzy & lofi hip hop beats",
    thumbnail: "https://img.youtube.com/vi/DWcJFNfaw9c/mqdefault.jpg",
    channel: "Chillhop Music",
    duration: "LIVE"
  },
  {
    id: "lTRiuFIWV54",
    title: "Jazz Relaxing Music in Cozy Coffee Shop",
    thumbnail: "https://img.youtube.com/vi/lTRiuFIWV54/mqdefault.jpg",
    channel: "Relax Jazz Cafe",
    duration: "3:45:21"
  }
]

export function VideoSearchBar({ onVideoLoad }: VideoSearchBarProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const detectedPlatform = detectPlatform(query)
  const platformInfo = getPlatformInfo(detectedPlatform)
  const isUrl = detectedPlatform !== null

  const handleSearch = async () => {
    if (!query.trim()) return

    if (isUrl) {
      // Extract URL from iframe tag if needed
      let videoUrl = query.trim()
      const srcMatch = videoUrl.match(/src=["']([^"']+)["']/)
      if (srcMatch) {
        videoUrl = srcMatch[1]
      }
      
      onVideoLoad(videoUrl)
      setQuery("")
      setShowResults(false)
      return
    }

    setIsSearching(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const filtered = SAMPLE_RESULTS.filter(r => 
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.channel.toLowerCase().includes(query.toLowerCase())
    )
    
    setResults(filtered.length > 0 ? filtered : SAMPLE_RESULTS)
    setShowResults(true)
    setIsSearching(false)
  }

  const handleSelectResult = (result: SearchResult) => {
    const url = `https://www.youtube.com/watch?v=${result.id}`
    onVideoLoad(url)
    setQuery("")
    setShowResults(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {/* Platform indicator */}
      {platformInfo && (
        <div className={cn(
          "mb-2 px-3 py-1.5 rounded-lg inline-flex items-center gap-2",
          platformInfo.bg
        )}>
          <platformInfo.icon className={cn("w-4 h-4", platformInfo.color)} />
          <span className={cn("text-sm font-medium", platformInfo.color)}>
            {platformInfo.name} detected
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Paste URL: YouTube, VK, Rutube, Kodik, or search YouTube..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="h-12 pl-12 pr-10 bg-card/50 backdrop-blur-xl border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {platformInfo ? (
              <platformInfo.icon className={cn("w-5 h-5", platformInfo.color)} />
            ) : (
              <Search className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          {query && (
            <button
              onClick={() => { setQuery(""); setShowResults(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary/50 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isUrl ? (
            "Load"
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {/* Supported platforms hint */}
      {!query && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Supported:</span>
          <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">YouTube</span>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">VK</span>
          <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400">Rutube</span>
          <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">Kodik</span>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 backdrop-blur-xl bg-card/90 border border-border rounded-xl overflow-hidden shadow-2xl shadow-background/50 z-50">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Youtube className="w-3 h-3 text-red-500" />
              YouTube Results
            </span>
          </div>
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelectResult(result)}
              className="w-full flex items-center gap-4 p-3 hover:bg-primary/10 transition-colors text-left"
            >
              <img
                src={result.thumbnail || "/placeholder.svg"}
                alt={result.title}
                className="w-28 h-16 object-cover rounded-lg bg-secondary"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-foreground text-sm font-medium line-clamp-2">{result.title}</h4>
                <p className="text-muted-foreground text-xs mt-1">{result.channel}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs bg-secondary/50 px-2 py-1 rounded">
                  {result.duration}
                </span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
