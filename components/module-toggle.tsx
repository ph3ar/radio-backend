"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import type { Module } from "@/lib/sound-modules"

interface ModuleToggleProps {
  module: Module
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}

export function ModuleToggle({ module, isEnabled, onToggle }: ModuleToggleProps) {
  const [level, setLevel] = useState(-60)

  useEffect(() => {
    if (!isEnabled) {
      setLevel(-60)
      return
    }

    const interval = setInterval(() => {
      const meterValue = module.meter.getValue()
      const db = typeof meterValue === "number" ? meterValue : -60
      setLevel(Math.max(-60, Math.min(0, db)))
    }, 50)

    return () => clearInterval(interval)
  }, [module.meter, isEnabled])

  const levelPercent = Math.max(0, ((level + 60) / 60) * 100)

  return (
    <div 
      className={`relative p-3 rounded-lg transition-all duration-200 ${
        isEnabled 
          ? "bg-white/[0.04] border border-cyan-500/20" 
          : "bg-white/[0.02] border border-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-medium transition-colors ${isEnabled ? "text-white/90" : "text-white/40"}`}>
            {module.name}
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${module.name} module`}
          className="data-[state=checked]:bg-cyan-500 scale-90"
        />
      </div>
      
      {/* Level indicator */}
      <div className="mt-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500/50 to-teal-500/50 transition-all duration-75 rounded-full"
          style={{ width: `${isEnabled ? levelPercent : 0}%` }}
        />
      </div>
    </div>
  )
}
