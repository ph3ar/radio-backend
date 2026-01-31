"use client"

import type { RobotEvent } from "@/lib/types"
import { Bot, Battery, Package, MapPin, AlertTriangle, LogOut, LogIn, CheckCircle, XCircle } from "lucide-react"

interface EventFeedProps {
  events: RobotEvent[]
}

function isGoodEvent(event: RobotEvent): boolean {
  const goodTypes = ["TASK_START", "LOGIN"]
  const goodOutcomes = ["COMPLETED", "SUCCESS", "ACTIVE"]
  if (goodTypes.includes(event.event_type)) return true
  if (event.event_type === "TASK_END" && event.goto_outcome && goodOutcomes.some(o => event.goto_outcome?.toUpperCase().includes(o))) return true
  if (event.event_type === "TASK_END" && !event.goto_outcome) return true
  return false
}

function isBadEvent(event: RobotEvent): boolean {
  const badTypes = ["E_STOP", "TASK_CANCELLED", "ERROR", "FAULT", "EMERGENCY", "LOGOUT"]
  const badOutcomes = ["INACTIVE", "ABORTED", "CANCELLED", "FAILED", "TIMEOUT", "ABORT"]
  if (badTypes.includes(event.event_type)) return true
  if (event.goto_outcome && badOutcomes.some(o => event.goto_outcome?.toUpperCase().includes(o))) return true
  return false
}

function getEventIcon(event: RobotEvent) {
  // Priority: event type first
  if (event.event_type === "LOGIN") return <LogIn className="w-3 h-3" />
  if (event.event_type === "LOGOUT") return <LogOut className="w-3 h-3" />
  if (event.event_type === "E_STOP" || event.event_type === "EMERGENCY") return <AlertTriangle className="w-3 h-3" />
  if (event.event_type === "TASK_CANCELLED") return <XCircle className="w-3 h-3" />
  if (event.goto_outcome?.toUpperCase().includes("ABORTED")) return <XCircle className="w-3 h-3" />
  if (event.goto_outcome?.toUpperCase().includes("INACTIVE")) return <XCircle className="w-3 h-3" />
  
  // Destination-based icons
  const dest = event.destination?.toLowerCase() || ""
  if (dest.includes("charge")) return <Battery className="w-3 h-3" />
  if (dest.includes("parcel") || dest.includes("load")) return <Package className="w-3 h-3" />
  if (dest.includes("map frame") || event.destination?.startsWith("(")) return <MapPin className="w-3 h-3" />
  
  // Good task completions
  if (event.event_type === "TASK_END" && isGoodEvent(event)) return <CheckCircle className="w-3 h-3" />
  
  return <Bot className="w-3 h-3" />
}

function getEventColor(event: RobotEvent): string {
  if (event.event_type === "E_STOP" || event.event_type === "EMERGENCY") return "text-red-400"
  if (event.event_type === "LOGOUT") return "text-orange-400"
  if (isBadEvent(event)) return "text-orange-400/80"
  if (event.event_type === "LOGIN") return "text-green-400"
  if (isGoodEvent(event)) return "text-cyan-400/70"
  return "text-white/50"
}

function getBorderColor(event: RobotEvent): string {
  if (event.event_type === "E_STOP" || event.event_type === "EMERGENCY") return "border-red-500/30"
  if (event.event_type === "LOGOUT") return "border-orange-500/20"
  if (isBadEvent(event)) return "border-orange-500/20"
  if (event.event_type === "LOGIN") return "border-green-500/20"
  if (isGoodEvent(event)) return "border-cyan-500/20"
  return "border-white/5"
}

function formatTime(timeStr: string) {
  try {
    const date = new Date(timeStr)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return timeStr
  }
}

export function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        Waiting for robot events...
      </div>
    )
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
      {events.slice(0, 12).map((event, i) => (
        <div
          key={event.task_id + i}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${getBorderColor(event)}`}
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <span className={getEventColor(event)}>
            {getEventIcon(event)}
          </span>
          <span className="font-mono text-cyan-300/80 w-16 shrink-0">
            {event.robot_id}
          </span>
          <span className={`truncate flex-1 ${isBadEvent(event) ? "text-white/70" : "text-white/50"}`}>
            {event.goto_outcome && isBadEvent(event) 
              ? `${event.event_type} - ${event.goto_outcome}` 
              : event.destination || event.event_type}
          </span>
          <span className="text-white/30 font-mono text-[10px]">
            {formatTime(event.time)}
          </span>
        </div>
      ))}
    </div>
  )
}
