"use client"

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background" />
      
      {/* Animated orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: "8s" }} />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: "10s", animationDelay: "2s" }} />
      <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: "12s", animationDelay: "4s" }} />
      
      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 77, 255, 0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(124, 77, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: "50px 50px"
        }}
      />
    </div>
  )
}
