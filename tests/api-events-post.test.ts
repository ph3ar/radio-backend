import { describe, it, expect } from 'vitest'
import { POST } from '../app/api/events/route'

describe('POST /api/events', () => {
  it('should return 200 for a valid event', async () => {
    const event = {
      time: new Date().toISOString(),
      badge_code: 'test',
      destination: 'A',
      duration_sec: 10,
      event_type: 'move',
      robot_id: 'robot1',
      task_id: 'task1',
    }
    const req = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('success', true)
    expect(json).toHaveProperty('count', 1)
  })
})
