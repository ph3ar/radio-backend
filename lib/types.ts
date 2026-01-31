export interface RobotEvent {
  time: string
  badge_code: string
  destination: string
  duration_sec: number
  event_type: string
  goto_outcome?: string
  robot_id: string
  task_id: string
}

export interface EventStore {
  events: RobotEvent[]
  lastUpdated: number
}
