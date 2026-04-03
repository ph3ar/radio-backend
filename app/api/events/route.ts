import { NextResponse } from "next/server"
import { z } from "zod"
import type { RobotEvent } from "@/lib/types"

const EventSchema = z.object({
  time: z.string().max(100).optional(),
  badge_code: z.string().max(100).optional(),
  destination: z.string().max(200).optional(),
  duration_sec: z.number().optional(),
  event_type: z.string().max(100),
  goto_outcome: z.string().max(100).optional(),
  robot_id: z.string().max(100),
  task_id: z.string().max(100).optional(),
})

const EventPayloadSchema = z.union([
  EventSchema,
  z.array(EventSchema).max(100),
])

// Extended event with sequence number for tracking
type StoredEvent = RobotEvent & { _seq: number }

// In-memory store for events (in production, use a database or Redis)
const eventStore: { 
  events: StoredEvent[]
  lastUpdated: number
  sequenceCounter: number
} = {
  events: [],
  lastUpdated: Date.now(),
  sequenceCounter: 0,
}

const MAX_EVENTS = 100

// POST - receive new events
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate payload shape and length to prevent DoS/Memory issues
    const parsedBody = EventPayloadSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request format or payload too large" },
        { status: 400 }
      )
    }

    const validatedData = parsedBody.data

    // Handle single event or array of events
    const newEvents: RobotEvent[] = Array.isArray(validatedData) ? validatedData : [validatedData]
    
    const addedEvents: StoredEvent[] = []
    
    // Validate and add events with unique sequence numbers
    for (const event of newEvents) {
      
      eventStore.sequenceCounter++
      
      const storedEvent: StoredEvent = {
        time: event.time || new Date().toISOString(),
        badge_code: event.badge_code || "",
        destination: event.destination || "",
        duration_sec: event.duration_sec || 0,
        event_type: event.event_type,
        goto_outcome: event.goto_outcome || "",
        robot_id: event.robot_id,
        task_id: event.task_id || crypto.randomUUID(),
        _seq: eventStore.sequenceCounter,
      }
      
      eventStore.events.unshift(storedEvent)
      addedEvents.push(storedEvent)
    }
    
    // Keep only the most recent events
    eventStore.events = eventStore.events.slice(0, MAX_EVENTS)
    eventStore.lastUpdated = Date.now()
    
    return NextResponse.json({ 
      success: true, 
      count: addedEvents.length,
      total: eventStore.events.length,
      latestSeq: eventStore.sequenceCounter,
    })
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

// GET - retrieve recent events
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const since = searchParams.get("since")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), MAX_EVENTS)
  
  let events = eventStore.events
  
  // Filter by timestamp if provided
  if (since) {
    const sinceTime = parseInt(since)
    events = events.filter(e => new Date(e.time).getTime() > sinceTime)
  }
  
  return NextResponse.json({
    events: events.slice(0, limit),
    lastUpdated: eventStore.lastUpdated,
    total: eventStore.events.length,
  })
}

// DELETE - clear all events
export async function DELETE(request: Request) {
  // Require an admin API key for destructive actions
  const authHeader = request.headers.get("Authorization")
  const apiKey = process.env.ADMIN_API_KEY

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  eventStore.events = []
  eventStore.lastUpdated = Date.now()
  
  return NextResponse.json({ success: true })
}
