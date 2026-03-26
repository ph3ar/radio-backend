import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DELETE, POST, GET } from '../app/api/events/route'

describe('DELETE /api/events', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return 401 when ADMIN_API_KEY is not set', async () => {
    delete process.env.ADMIN_API_KEY

    const req = new Request('http://localhost/api/events', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer some-token' },
    })

    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('should return 401 for missing authorization header', async () => {
    process.env.ADMIN_API_KEY = 'secret-key'

    const req = new Request('http://localhost/api/events', {
      method: 'DELETE',
    })

    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('should return 401 for incorrect token', async () => {
    process.env.ADMIN_API_KEY = 'secret-key'

    const req = new Request('http://localhost/api/events', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer wrong-token' },
    })

    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('should return 200 and clear events for correct token', async () => {
    process.env.ADMIN_API_KEY = 'secret-key'

    // Seed an event first to ensure it actually clears it
    const event = {
      time: new Date().toISOString(),
      badge_code: 'test',
      destination: 'A',
      duration_sec: 10,
      event_type: 'move',
      robot_id: 'robot1',
      task_id: 'task1',
    }
    const postReq = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(postReq)

    // Verify it was added
    const getReq1 = new Request('http://localhost/api/events')
    const resGet1 = await GET(getReq1)
    const jsonGet1 = await resGet1.json()
    expect(jsonGet1.events.length).toBeGreaterThan(0)

    // Send valid DELETE request
    const req = new Request('http://localhost/api/events', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer secret-key' },
    })

    const res = await DELETE(req)
    expect(res.status).toBe(200)

    // Verify it was cleared
    const getReq2 = new Request('http://localhost/api/events')
    const resGet2 = await GET(getReq2)
    const jsonGet2 = await resGet2.json()
    expect(jsonGet2.events.length).toBe(0)
  })
})
