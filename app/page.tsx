"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import * as Tone from "tone"
import { AudioVisualizer } from "@/components/audio-visualizer"
import { ModuleToggle } from "@/components/module-toggle"
import { EventFeed } from "@/components/event-feed"
import { ApiDocs } from "@/components/api-docs"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Radio } from "lucide-react"
import {
  LofiBeatModule,
  AmbientPadModule,
  BassModule,
  RhodesModule,
  RobotEventModule,
  VinylCrackleModule,
  SystemHealth,
  type Module,
} from "@/lib/sound-modules"
import type { RobotEvent } from "@/lib/types"

type ModuleConfig = {
  id: string
  create: () => Module
  defaultEnabled: boolean
  continuous: boolean
}

const MODULE_CONFIGS: ModuleConfig[] = [
  { id: "lofiBeat", create: () => new LofiBeatModule(), defaultEnabled: true, continuous: true },
  { id: "ambientPad", create: () => new AmbientPadModule(), defaultEnabled: true, continuous: true },
  { id: "bass", create: () => new BassModule(), defaultEnabled: true, continuous: true },
  { id: "rhodes", create: () => new RhodesModule(), defaultEnabled: true, continuous: true },
  { id: "robotEvent", create: () => new RobotEventModule(), defaultEnabled: true, continuous: false },
  { id: "vinylCrackle", create: () => new VinylCrackleModule(), defaultEnabled: true, continuous: true },
]

export default function PH3ARRadio() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [events, setEvents] = useState<RobotEvent[]>([])
  const [modules, setModules] = useState<Map<string, Module>>(new Map())
  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    new Set(MODULE_CONFIGS.filter(m => m.defaultEnabled).map(m => m.id))
  )
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [totalEventsReceived, setTotalEventsReceived] = useState(0)
  const [systemHealth, setSystemHealth] = useState(0.7)
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const modulesInitializedRef = useRef(false)
  const lastFetchTimeRef = useRef(0)

  // Initialize modules
  useEffect(() => {
    if (modulesInitializedRef.current) return
    modulesInitializedRef.current = true

    const moduleMap = new Map<string, Module>()
    for (const config of MODULE_CONFIGS) {
      moduleMap.set(config.id, config.create())
    }
    setModules(moduleMap)
    
    // Subscribe to health updates
    const unsub = SystemHealth.getInstance().subscribe(setSystemHealth)

    return () => {
      unsub()
      for (const module of moduleMap.values()) {
        module.dispose()
      }
    }
  }, [])

  // Volume control
  useEffect(() => {
    const dbValue = isMuted ? -Infinity : (volume / 100) * 40 - 30
    Tone.getDestination().volume.rampTo(dbValue, 0.1)
  }, [volume, isMuted])

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`/api/events?limit=50`)
      const data = await response.json()
      
      if (data.events && data.events.length > 0) {
        setEvents(data.events)
        setTotalEventsReceived(data.total)
        
        // Trigger event-reactive module
        const eventModule = modules.get("robotEvent")
        if (eventModule && enabledModules.has("robotEvent") && !eventModule.isMuted()) {
          eventModule.play(data.events, Tone.now())
        }
      }
      
      lastFetchTimeRef.current = Date.now()
    } catch (err) {
      console.error("Failed to fetch events:", err)
    }
  }, [modules, enabledModules])

  const startLoop = useCallback(() => {
    // Start continuous modules
    for (const config of MODULE_CONFIGS) {
      const module = modules.get(config.id)
      if (module && config.continuous && enabledModules.has(config.id)) {
        module.play([], Tone.now())
      }
    }

    // Poll for events every 2 seconds
    fetchEvents()
    pollIntervalRef.current = setInterval(fetchEvents, 2000)
  }, [modules, enabledModules, fetchEvents])

  const stopLoop = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    for (const module of modules.values()) {
      module.stop()
    }
  }, [modules])

  const handlePlayPause = async () => {
    if (!isPlaying) {
      await Tone.start()
      Tone.getTransport().start()
      startLoop()
    } else {
      stopLoop()
      Tone.getTransport().stop()
    }
    setIsPlaying(!isPlaying)
  }

  const handleModuleToggle = (moduleId: string, enabled: boolean) => {
    const config = MODULE_CONFIGS.find(c => c.id === moduleId)
    const module = modules.get(moduleId)
    
    setEnabledModules(prev => {
      const next = new Set(prev)
      if (enabled) {
        next.add(moduleId)
        module?.unMute()
        if (isPlaying && config?.continuous) {
          module?.play([], Tone.now())
        }
      } else {
        next.delete(moduleId)
        module?.mute()
      }
      return next
    })
  }

  const uniqueRobots = [...new Set(events.map(e => e.robot_id))].length

  return (
    <div className="min-h-screen bg-[#080c10] text-white">
      <AudioVisualizer isPlaying={isPlaying} events={events} health={systemHealth} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">PH3AR Radio</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Robot Sonification</p>
            </div>
          </div>

          {isPlaying && (
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-white/40">Robots </span>
                <span className="font-mono text-cyan-400">{uniqueRobots}</span>
              </div>
              <div>
                <span className="text-white/40">Events </span>
                <span className="font-mono text-white/70">{totalEventsReceived}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40">Health</span>
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ 
                      width: `${systemHealth * 100}%`,
                      backgroundColor: systemHealth > 0.6 ? '#22d3ee' : systemHealth > 0.3 ? '#fbbf24' : '#ef4444'
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400/80">Live</span>
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-start justify-center p-6 md:p-8">
          <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
            {/* Left: Controls */}
            <div className="space-y-6">
              {/* Play Button */}
              <div className="flex flex-col items-center py-8">
                <Button
                  onClick={handlePlayPause}
                  aria-label={isPlaying ? "Pause radio" : "Play radio"}
                  className={`w-24 h-24 rounded-full transition-all duration-300 ${
                    isPlaying 
                      ? "bg-white/5 hover:bg-white/10 border border-cyan-500/30" 
                      : "bg-gradient-to-br from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 shadow-lg shadow-cyan-500/20"
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10 text-cyan-400" />
                  ) : (
                    <Play className="w-10 h-10 text-white ml-1" />
                  )}
                </Button>
                
                <p className="mt-4 text-xs text-white/40">
                  {isPlaying ? "Listening for robot events..." : "Press to start"}
                </p>

                {/* Volume */}
                <div className="flex items-center gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label={isMuted ? "Unmute volume" : "Mute volume"}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <Slider
                    aria-label="Volume"
                    value={[isMuted ? 0 : volume]}
                    onValueChange={(v) => { setVolume(v[0]); setIsMuted(false) }}
                    max={100}
                    step={1}
                    className="w-28"
                  />
                </div>
              </div>

              {/* Sound Modules */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Sound Modules</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODULE_CONFIGS.map((config) => {
                    const module = modules.get(config.id)
                    if (!module) return null
                    return (
                      <ModuleToggle
                        key={config.id}
                        module={module}
                        isEnabled={enabledModules.has(config.id)}
                        onToggle={(enabled) => handleModuleToggle(config.id, enabled)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: Event Feed & API */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Event Feed</p>
                <EventFeed events={events} />
              </div>

              <ApiDocs />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-white/5">
          <p className="text-[10px] text-white/20 text-center">
            PH3AR Radio - Lofi beats for your robots
          </p>
        </footer>
      </div>
    </div>
  )
}
