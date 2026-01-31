import { describe, it, expect } from 'vitest'
import { GET } from '../app/api/events/route'

describe('GET /api/events', () => {
  it('should return 200 and a valid response', async () => {
    const url = 'http://localhost/api/events'
    const req = { url } as Request
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('events')
    expect(Array.isArray(json.events)).toBe(true)
  })
})
