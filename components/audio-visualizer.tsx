"use client"

import { useEffect, useRef } from "react"
import type { RobotEvent } from "@/lib/types"

interface AudioVisualizerProps {
  isPlaying: boolean
  events: RobotEvent[]
  health?: number
}

export function AudioVisualizer({ isPlaying, events, health = 0.7 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const timeRef = useRef(0)
  const particlesRef = useRef<Array<{
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    size: number
    color: string
  }>>([])
  const robotPositionsRef = useRef<Map<string, { angle: number; radius: number }>>(new Map())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // ⚡ Bolt: Calculate unique robots outside the animation loop
    // This prevents an O(N) array mapping, Set allocation, and array slicing on every frame (60fps)
    const uniqueRobots = [...new Set(events.map(e => e.robot_id))]
    const recentEvents = events.slice(0, 3)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      timeRef.current += 0.008

      // Fade trail
      ctx.fillStyle = "rgba(8, 12, 16, 0.06)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      if (isPlaying) {
        // Central glow - color shifts with health
        const glowRadius = 250 + Math.sin(timeRef.current * 0.3) * 30
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, glowRadius
        )
        
        // Color shifts: cyan (healthy) -> orange (warning) -> red (critical)
        const healthColor = health > 0.6 
          ? `rgba(34, 211, 238, ${0.04 + health * 0.04})` 
          : health > 0.3 
            ? `rgba(251, 191, 36, ${0.04 + health * 0.04})`
            : `rgba(239, 68, 68, ${0.06})`
        
        gradient.addColorStop(0, healthColor)
        gradient.addColorStop(0.4, health > 0.5 ? "rgba(20, 184, 166, 0.03)" : "rgba(180, 83, 9, 0.03)")
        gradient.addColorStop(1, "transparent")
        
        ctx.beginPath()
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Orbital rings - wobble more when health is low
        for (let i = 0; i < 4; i++) {
          const wobble = (1 - health) * 20 * Math.sin(timeRef.current * 2 + i)
          const ringRadius = 120 + i * 60 + wobble
          const alpha = 0.04 - i * 0.008
          
          ctx.beginPath()
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2)
          const ringColor = health > 0.5 ? "34, 211, 238" : health > 0.3 ? "251, 191, 36" : "239, 68, 68"
          ctx.strokeStyle = `rgba(${ringColor}, ${alpha})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Robot dots - each robot gets a consistent position
        uniqueRobots.forEach((robotId, i) => {
          // Initialize or get robot position
          if (!robotPositionsRef.current.has(robotId)) {
            const hash = robotId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
            robotPositionsRef.current.set(robotId, {
              angle: (hash % 360) * (Math.PI / 180),
              radius: 140 + (hash % 3) * 50,
            })
          }
          
          const pos = robotPositionsRef.current.get(robotId)!
          const angle = pos.angle + timeRef.current * 0.15
          const radius = pos.radius + Math.sin(timeRef.current * 2 + i) * 10
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          // Robot dot
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(34, 211, 238, ${0.6 + Math.sin(timeRef.current * 3 + i) * 0.3})`
          ctx.fill()
          
          // Glow
          ctx.beginPath()
          ctx.arc(x, y, 8, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(34, 211, 238, 0.15)"
          ctx.fill()
        })

        // Spawn particles for recent events
        recentEvents.forEach((event) => {
          if (Math.random() < 0.1) {
            const pos = robotPositionsRef.current.get(event.robot_id)
            if (pos) {
              const angle = pos.angle + timeRef.current * 0.15
              const x = centerX + Math.cos(angle) * pos.radius
              const y = centerY + Math.sin(angle) * pos.radius
              
              particlesRef.current.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                life: 80 + Math.random() * 40,
                maxLife: 120,
                size: 1 + Math.random() * 2,
                color: event.destination?.includes("Charge") ? "20, 184, 166" : "34, 211, 238",
              })
            }
          }
        })
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.98
        p.vy *= 0.98
        p.life--
        
        const alpha = (p.life / p.maxLife) * 0.6
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color}, ${alpha})`
        ctx.fill()
      }
    }

    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, events, health])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
    />
  )
}
