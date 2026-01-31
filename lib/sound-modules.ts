import * as Tone from "tone"
import type { RobotEvent } from "./types"

export interface Module {
  readonly name: string
  readonly description: string
  readonly meter: Tone.Meter
  play(events: RobotEvent[], time: number): void
  stop(): void
  isMuted(): boolean
  mute(): void
  unMute(): void
  dispose(): void
  setHealth?(health: number): void
}

// System health tracker - shared across modules
export class SystemHealth {
  private static instance: SystemHealth
  private _health = 1.0 // 0 = bad, 1 = good
  private listeners: ((h: number) => void)[] = []
  
  static getInstance() {
    if (!SystemHealth.instance) {
      SystemHealth.instance = new SystemHealth()
    }
    return SystemHealth.instance
  }
  
  get health() { return this._health }
  
  adjustHealth(delta: number) {
    this._health = Math.max(0, Math.min(1, this._health + delta))
    this.listeners.forEach(l => l(this._health))
  }
  
  // Decay towards neutral over time
  tick() {
    this._health = this._health + (0.7 - this._health) * 0.02
  }
  
  subscribe(listener: (h: number) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
}

// Lofi Beat Module - now reacts to system health
export class LofiBeatModule implements Module {
  readonly name = "Lofi Beat"
  readonly description = "Reactive chill beat"
  readonly meter: Tone.Meter
  private kick: Tone.MembraneSynth
  private snare: Tone.NoiseSynth
  private snareBody: Tone.Synth
  private hihat: Tone.MetalSynth
  private filter: Tone.Filter
  private bitcrusher: Tone.BitCrusher
  private reverb: Tone.Reverb
  private compressor: Tone.Compressor
  private muted = false
  private kickLoop: Tone.Loop | null = null
  private kickGhost: Tone.Loop | null = null
  private snareLoop: Tone.Loop | null = null
  private hihatLoop: Tone.Loop | null = null
  private isRunning = false
  private healthUnsub: (() => void) | null = null

  constructor() {
    this.meter = new Tone.Meter()
    this.filter = new Tone.Filter(2000, "lowpass")
    this.bitcrusher = new Tone.BitCrusher(16) // Start clean
    this.reverb = new Tone.Reverb({ decay: 1.2, wet: 0.25 })
    this.compressor = new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.003, release: 0.25 })
    
    // Punchy kick with body
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 0.35, sustain: 0, release: 0.4 },
    })
    this.kick.volume.value = -6
    
    // Layered snare: noise + body
    this.snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
    })
    this.snare.volume.value = -10
    
    this.snareBody = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    })
    this.snareBody.volume.value = -14
    
    // Crispy hihats
    this.hihat = new Tone.MetalSynth({
      frequency: 300,
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 40,
      resonance: 5000,
      octaves: 1.2,
    })
    this.hihat.volume.value = -18

    // Routing
    this.kick.connect(this.compressor)
    this.snare.connect(this.compressor)
    this.snareBody.connect(this.compressor)
    this.hihat.connect(this.filter)
    this.compressor.connect(this.filter)
    this.filter.connect(this.bitcrusher)
    this.bitcrusher.connect(this.reverb)
    this.reverb.connect(this.meter)
    this.meter.toDestination()
    
    // React to health
    this.healthUnsub = SystemHealth.getInstance().subscribe((h) => {
      // Lower health = more crushed/filtered
      this.filter.frequency.rampTo(800 + h * 1500, 0.5)
      this.bitcrusher.bits.rampTo(Math.floor(6 + h * 10), 0.3)
      this.reverb.wet.rampTo(0.15 + (1 - h) * 0.3, 0.5)
    })
  }

  play() {
    if (this.muted || this.isRunning) return
    
    Tone.getTransport().bpm.value = 72

    // Main kick on 1 and 3
    this.kickLoop = new Tone.Loop((time) => {
      this.kick.triggerAttackRelease("C1", "8n", time, 0.9)
    }, "2n")
    
    // Ghost kick for swing
    this.kickGhost = new Tone.Loop((time) => {
      this.kick.triggerAttackRelease("C1", "16n", time, 0.4)
    }, "1m")
    this.kickGhost.start("0:2:3")
    
    // Snare on 2 and 4 with slight humanization
    this.snareLoop = new Tone.Loop((time) => {
      const humanize = (Math.random() - 0.5) * 0.01
      this.snare.triggerAttackRelease("16n", time + humanize)
      this.snareBody.triggerAttackRelease("A2", "32n", time + humanize, 0.3)
    }, "2n")
    this.snareLoop.start("0:1")

    // Swung hihats
    this.hihatLoop = new Tone.Loop((time) => {
      const swing = Math.random() > 0.5 ? 0.02 : 0
      const vel = Math.random() * 0.25 + 0.1
      this.hihat.triggerAttackRelease("64n", time + swing, vel)
    }, "8n")

    this.kickLoop.start(0)
    this.hihatLoop.start(0)
    this.isRunning = true
  }

  stop() {
    this.kickLoop?.stop()
    this.kickGhost?.stop()
    this.snareLoop?.stop()
    this.hihatLoop?.stop()
    this.kickLoop?.dispose()
    this.kickGhost?.dispose()
    this.snareLoop?.dispose()
    this.hihatLoop?.dispose()
    this.kickLoop = null
    this.kickGhost = null
    this.snareLoop = null
    this.hihatLoop = null
    this.isRunning = false
  }

  isMuted() { return this.muted }
  mute() { this.muted = true; this.stop() }
  unMute() { this.muted = false }
  dispose() {
    this.healthUnsub?.()
    this.stop()
    this.kick.dispose()
    this.snare.dispose()
    this.snareBody.dispose()
    this.hihat.dispose()
    this.filter.dispose()
    this.bitcrusher.dispose()
    this.reverb.dispose()
    this.compressor.dispose()
    this.meter.dispose()
  }
}

// Ambient Pad - darkens with bad health
export class AmbientPadModule implements Module {
  readonly name = "Ambient Pad"
  readonly description = "Mood-reactive pads"
  readonly meter: Tone.Meter
  private synth: Tone.PolySynth
  private filter: Tone.AutoFilter
  private reverb: Tone.Reverb
  private chorus: Tone.Chorus
  private muted = false
  private isRunning = false
  private chordLoop: Tone.Loop | null = null
  private chordIndex = 0
  private healthUnsub: (() => void) | null = null

  // Major (happy) and minor (sad) chord progressions
  private majorChords = [
    ["C4", "E4", "G4", "B4"],
    ["F3", "A3", "C4", "E4"],
    ["G3", "B3", "D4", "F#4"],
    ["A3", "C4", "E4", "G4"],
  ]
  private minorChords = [
    ["A3", "C4", "E4", "G4"],
    ["D3", "F3", "A3", "C4"],
    ["E3", "G3", "B3", "D4"],
    ["F3", "Ab3", "C4", "Eb4"],
  ]

  constructor() {
    this.meter = new Tone.Meter()
    this.reverb = new Tone.Reverb({ decay: 8, wet: 0.6 })
    this.filter = new Tone.AutoFilter({ frequency: 0.05, baseFrequency: 400, octaves: 3 })
    this.chorus = new Tone.Chorus({ frequency: 0.3, delayTime: 4, depth: 0.6, wet: 0.4 })
    
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 3, decay: 2, sustain: 0.7, release: 5 },
    })
    this.synth.volume.value = -16
    
    this.synth.connect(this.chorus)
    this.chorus.connect(this.filter)
    this.filter.connect(this.reverb)
    this.reverb.connect(this.meter)
    this.meter.toDestination()
    
    // React to health - shift between major/minor feel
    this.healthUnsub = SystemHealth.getInstance().subscribe((h) => {
      this.filter.baseFrequency = 200 + h * 400
      this.synth.volume.rampTo(-18 + h * 4, 1)
    })
  }

  play() {
    if (this.muted || this.isRunning) return
    
    this.filter.start()
    this.chorus.start()
    
    this.chordLoop = new Tone.Loop((time) => {
      const health = SystemHealth.getInstance().health
      // Blend between major and minor based on health
      const chords = health > 0.5 ? this.majorChords : this.minorChords
      this.synth.triggerAttackRelease(chords[this.chordIndex], "2m", time, 0.25)
      this.chordIndex = (this.chordIndex + 1) % chords.length
    }, "2m")
    this.chordLoop.start(0)
    this.isRunning = true
  }

  stop() {
    this.chordLoop?.stop()
    this.chordLoop?.dispose()
    this.chordLoop = null
    this.synth.releaseAll()
    this.filter.stop()
    this.chorus.stop()
    this.isRunning = false
  }

  isMuted() { return this.muted }
  mute() { this.muted = true; this.stop() }
  unMute() { this.muted = false }
  dispose() {
    this.healthUnsub?.()
    this.stop()
    this.synth.dispose()
    this.filter.dispose()
    this.reverb.dispose()
    this.chorus.dispose()
    this.meter.dispose()
  }
}

// Bass Module - shifts to minor on low health
export class BassModule implements Module {
  readonly name = "Sub Bass"
  readonly description = "Health-reactive bass"
  readonly meter: Tone.Meter
  private synth: Tone.MonoSynth
  private filter: Tone.Filter
  private muted = false
  private isRunning = false
  private bassLoop: Tone.Loop | null = null
  private noteIndex = 0
  private healthUnsub: (() => void) | null = null
  
  private majorNotes = ["C2", "E2", "G2", "A2", "G2", "E2", "D2", "C2"]
  private minorNotes = ["A1", "C2", "E2", "G2", "F2", "E2", "D2", "C2"]

  constructor() {
    this.meter = new Tone.Meter()
    this.filter = new Tone.Filter(400, "lowpass")
    
    this.synth = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3, baseFrequency: 80, octaves: 1.5 },
    })
    this.synth.volume.value = -8
    
    this.synth.connect(this.filter)
    this.filter.connect(this.meter)
    this.meter.toDestination()
    
    this.healthUnsub = SystemHealth.getInstance().subscribe((h) => {
      this.filter.frequency.rampTo(200 + h * 300, 0.5)
    })
  }

  play() {
    if (this.muted || this.isRunning) return
    
    this.bassLoop = new Tone.Loop((time) => {
      const health = SystemHealth.getInstance().health
      const notes = health > 0.5 ? this.majorNotes : this.minorNotes
      const humanize = (Math.random() - 0.5) * 0.015
      this.synth.triggerAttackRelease(notes[this.noteIndex], "8n", time + humanize, 0.7)
      this.noteIndex = (this.noteIndex + 1) % notes.length
    }, "4n")
    this.bassLoop.start(0)
    this.isRunning = true
  }

  stop() {
    this.bassLoop?.stop()
    this.bassLoop?.dispose()
    this.bassLoop = null
    this.isRunning = false
  }

  isMuted() { return this.muted }
  mute() { this.muted = true; this.stop() }
  unMute() { this.muted = false }
  dispose() {
    this.healthUnsub?.()
    this.stop()
    this.synth.dispose()
    this.filter.dispose()
    this.meter.dispose()
  }
}

// Robot Event Module - completely redesigned with better sounds
export class RobotEventModule implements Module {
  readonly name = "Robot Events"
  readonly description = "Event sonification"
  readonly meter: Tone.Meter
  
  // COINS - Layered for satisfying sound
  private coinHigh: Tone.PolySynth
  private coinBody: Tone.PolySynth
  private coinShimmer: Tone.PolySynth
  
  // SUCCESS - Warm completion
  private successSynth: Tone.PolySynth
  
  // LOGIN CASCADE - Rising arpeggio like slot machine
  private loginSynth: Tone.PolySynth
  
  // WARNING - Detuned uncomfortable
  private warningSynth: Tone.DuoSynth
  
  // LOGOUT - Descending sad
  private logoutSynth: Tone.Synth
  
  // CRITICAL ERROR - Aggressive
  private errorSynth: Tone.MetalSynth
  private errorNoise: Tone.NoiseSynth
  
  private mainReverb: Tone.Reverb
  private coinDelay: Tone.PingPongDelay
  private warningDist: Tone.Distortion
  
  private muted = false
  private lastEventIds = new Set<string>()

  constructor() {
    this.meter = new Tone.Meter()
    this.mainReverb = new Tone.Reverb({ decay: 2.5, wet: 0.35 })
    this.coinDelay = new Tone.PingPongDelay({ delayTime: "16n", feedback: 0.25, wet: 0.3 })
    this.warningDist = new Tone.Distortion(0.4)
    
    // === COIN SOUNDS (Layered for richness) ===
    // High sparkle
    this.coinHigh = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.15 },
    })
    this.coinHigh.volume.value = -4
    
    // Body/bell tone
    this.coinBody = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.4 },
    })
    this.coinBody.volume.value = -8
    
    // Shimmer/tail
    this.coinShimmer = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.8 },
    })
    this.coinShimmer.volume.value = -18
    
    // === SUCCESS ===
    this.successSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.6 },
    })
    this.successSynth.volume.value = -10
    
    // === LOGIN CASCADE ===
    this.loginSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.25 },
    })
    this.loginSynth.volume.value = -4
    
    // === WARNING - Detuned duo synth ===
    this.warningSynth = new Tone.DuoSynth({
      vibratoAmount: 0.3,
      vibratoRate: 5,
      harmonicity: 1.02, // Slight detune for discomfort
      voice0: {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.3 },
      },
      voice1: {
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 },
      },
    })
    this.warningSynth.volume.value = -12
    
    // === LOGOUT ===
    this.logoutSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 1.2, sustain: 0, release: 1.5 },
    })
    this.logoutSynth.volume.value = -8
    
    // === CRITICAL ERROR ===
    this.errorSynth = new Tone.MetalSynth({
      frequency: 120,
      envelope: { attack: 0.001, decay: 0.2, release: 0.15 },
      harmonicity: 12,
      modulationIndex: 20,
      resonance: 1000,
      octaves: 1,
    })
    this.errorSynth.volume.value = -8
    
    this.errorNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
    })
    this.errorNoise.volume.value = -10

    // Routing
    const coinBus = new Tone.Gain()
    this.coinHigh.connect(coinBus)
    this.coinBody.connect(coinBus)
    this.coinShimmer.connect(coinBus)
    this.loginSynth.connect(coinBus)
    coinBus.connect(this.coinDelay)
    this.coinDelay.connect(this.mainReverb)
    
    this.successSynth.connect(this.mainReverb)
    
    this.warningSynth.connect(this.warningDist)
    this.warningDist.connect(this.mainReverb)
    this.logoutSynth.connect(this.mainReverb)
    
    this.errorSynth.connect(this.mainReverb)
    this.errorNoise.connect(this.mainReverb)
    
    this.mainReverb.connect(this.meter)
    this.meter.toDestination()
  }

  private playCoin(time: number, robotId: string) {
    // Hash robot ID to get consistent pitch
    const hash = robotId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
    const coinPitches = ["E6", "G6", "A6", "B6", "D7", "E7"]
    const baseNote = coinPitches[hash % coinPitches.length]
    const freq = Tone.Frequency(baseNote).toFrequency()
    
    // Layer 1: High attack
    this.coinHigh.triggerAttackRelease(baseNote, "32n", time, 0.7)
    // Layer 2: Body (octave down)
    this.coinBody.triggerAttackRelease(Tone.Frequency(freq / 2).toNote(), "16n", time, 0.5)
    // Layer 3: Shimmer (fifth up)
    this.coinShimmer.triggerAttackRelease(Tone.Frequency(freq * 1.5).toNote(), "8n", time + 0.02, 0.25)
  }

  private playLoginCascade(time: number) {
    // Ascending arpeggio like coins pouring in
    const notes = ["C5", "E5", "G5", "C6", "E6", "G6", "C7"]
    notes.forEach((note, i) => {
      const vel = 0.6 - i * 0.06
      this.loginSynth.triggerAttackRelease(note, "32n", time + i * 0.045, vel)
      // Add shimmer on every other note
      if (i % 2 === 0) {
        this.coinShimmer.triggerAttackRelease(Tone.Frequency(note).transpose(12).toNote(), "8n", time + i * 0.045 + 0.02, 0.15)
      }
    })
    // Boost health significantly
    SystemHealth.getInstance().adjustHealth(0.15)
  }

  private playLogout(time: number, robotId: string) {
    const hash = robotId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
    const startNotes = ["E4", "G4", "A4", "B4"]
    const startNote = startNotes[hash % startNotes.length]
    const startFreq = Tone.Frequency(startNote).toFrequency()
    
    this.logoutSynth.triggerAttackRelease(startNote, "2n", time, 0.6)
    this.logoutSynth.frequency.setValueAtTime(startFreq, time)
    this.logoutSynth.frequency.exponentialRampToValueAtTime(startFreq * 0.3, time + 0.8)
    
    // Hurt health
    SystemHealth.getInstance().adjustHealth(-0.1)
  }

  private playWarning(time: number, robotId: string) {
    const hash = robotId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
    const notes = ["A3", "C4", "D4", "E4", "F4"]
    const note = notes[hash % notes.length]
    
    this.warningSynth.triggerAttackRelease(note, "8n", time, 0.5)
    
    SystemHealth.getInstance().adjustHealth(-0.06)
  }

  private playCriticalError(time: number) {
    // Harsh metallic hit
    this.errorSynth.triggerAttackRelease("16n", time, 0.8)
    this.errorNoise.triggerAttackRelease("16n", time)
    // Double hit
    this.errorSynth.triggerAttackRelease("32n", time + 0.12, 0.5)
    this.errorNoise.triggerAttackRelease("32n", time + 0.12)
    
    // Big health hit
    SystemHealth.getInstance().adjustHealth(-0.2)
  }

  private playSuccess(time: number, robotId: string) {
    const hash = robotId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
    const chords = [
      ["C5", "E5", "G5"],
      ["D5", "F#5", "A5"],
      ["E5", "G#5", "B5"],
      ["G5", "B5", "D6"],
    ]
    const chord = chords[hash % chords.length]
    this.successSynth.triggerAttackRelease(chord, "8n", time, 0.4)
    
    SystemHealth.getInstance().adjustHealth(0.04)
  }

  private classifyEvent(event: RobotEvent): "login" | "logout" | "critical" | "warning" | "success" | "coin" | "neutral" {
    const type = event.event_type?.toUpperCase() || ""
    const outcome = event.goto_outcome?.toUpperCase() || ""
    
    if (type === "LOGIN") return "login"
    if (type === "LOGOUT") return "logout"
    if (["E_STOP", "EMERGENCY", "FAULT"].includes(type)) return "critical"
    if (["TASK_CANCELLED", "ERROR"].includes(type)) return "warning"
    if (outcome.includes("ABORTED") || outcome.includes("INACTIVE") || outcome.includes("CANCELLED") || outcome.includes("FAILED")) return "warning"
    if (type === "TASK_END" && !outcome.includes("ABORTED") && !outcome.includes("INACTIVE")) return "success"
    if (type === "TASK_START") return "coin"
    
    return "neutral"
  }

  play(events: RobotEvent[]) {
    if (this.muted || events.length === 0) return
    
    // Tick health towards neutral
    SystemHealth.getInstance().tick()
    
    // Filter new events
    const newEvents = events.filter(e => {
      const eventId = e.task_id || `${e.robot_id}-${e.time}-${e.event_type}`
      return !this.lastEventIds.has(eventId)
    })
    
    // Update cache
    this.lastEventIds = new Set(events.map(e => e.task_id || `${e.robot_id}-${e.time}-${e.event_type}`))
    if (this.lastEventIds.size > 150) {
      const arr = Array.from(this.lastEventIds)
      this.lastEventIds = new Set(arr.slice(-150))
    }
    
    // Process events
    newEvents.slice(0, 10).forEach((event, i) => {
      const baseDelay = i * 0.1
      const classification = this.classifyEvent(event)
      
      Tone.getTransport().scheduleOnce((time) => {
        switch (classification) {
          case "login":
            this.playLoginCascade(time)
            break
          case "logout":
            this.playLogout(time, event.robot_id)
            break
          case "critical":
            this.playCriticalError(time)
            break
          case "warning":
            this.playWarning(time, event.robot_id)
            break
          case "success":
            this.playSuccess(time, event.robot_id)
            break
          case "coin":
            this.playCoin(time, event.robot_id)
            SystemHealth.getInstance().adjustHealth(0.03)
            break
          default:
            // Neutral - soft coin
            this.coinBody.triggerAttackRelease("G5", "32n", time, 0.2)
        }
      }, `+${baseDelay}`)
    })
  }

  stop() {
    this.lastEventIds.clear()
  }
  
  isMuted() { return this.muted }
  mute() { this.muted = true }
  unMute() { this.muted = false }
  
  dispose() {
    this.coinHigh.dispose()
    this.coinBody.dispose()
    this.coinShimmer.dispose()
    this.successSynth.dispose()
    this.loginSynth.dispose()
    this.warningSynth.dispose()
    this.logoutSynth.dispose()
    this.errorSynth.dispose()
    this.errorNoise.dispose()
    this.mainReverb.dispose()
    this.coinDelay.dispose()
    this.warningDist.dispose()
    this.meter.dispose()
  }
}

// Vinyl Crackle - increases with low health (more degraded feel)
export class VinylCrackleModule implements Module {
  readonly name = "Vinyl Crackle"
  readonly description = "Ambient texture"
  readonly meter: Tone.Meter
  private noise: Tone.Noise
  private filter: Tone.Filter
  private muted = false
  private isRunning = false
  private healthUnsub: (() => void) | null = null

  constructor() {
    this.meter = new Tone.Meter()
    this.filter = new Tone.Filter({ frequency: 1200, type: "bandpass", Q: 0.8 })
    
    this.noise = new Tone.Noise("brown")
    this.noise.volume.value = -30
    
    this.noise.connect(this.filter)
    this.filter.connect(this.meter)
    this.meter.toDestination()
    
    // More crackle when health is low
    this.healthUnsub = SystemHealth.getInstance().subscribe((h) => {
      this.noise.volume.rampTo(-36 + (1 - h) * 12, 0.5)
    })
  }

  play() {
    if (this.muted || this.isRunning) return
    this.noise.start()
    this.isRunning = true
  }

  stop() {
    if (this.isRunning) {
      this.noise.stop()
      this.isRunning = false
    }
  }

  isMuted() { return this.muted }
  mute() { this.muted = true; this.stop() }
  unMute() { this.muted = false }
  dispose() {
    this.healthUnsub?.()
    this.stop()
    this.noise.dispose()
    this.filter.dispose()
    this.meter.dispose()
  }
}

// Rhodes - plays sadder voicings on low health
export class RhodesModule implements Module {
  readonly name = "Rhodes Keys"
  readonly description = "Mood-aware keys"
  readonly meter: Tone.Meter
  private synth: Tone.PolySynth
  private tremolo: Tone.Tremolo
  private reverb: Tone.Reverb
  private chorus: Tone.Chorus
  private muted = false
  private isRunning = false
  private keysLoop: Tone.Loop | null = null
  private voicingIndex = 0
  private healthUnsub: (() => void) | null = null

  private happyVoicings = [
    ["E4", "G#4", "B4"],
    ["D4", "F#4", "A4"],
    ["C4", "E4", "G4"],
    ["A3", "C#4", "E4"],
  ]
  
  private sadVoicings = [
    ["A3", "C4", "E4"],
    ["D3", "F4", "A4"],
    ["E3", "G4", "B4"],
    ["G3", "Bb3", "D4"],
  ]

  constructor() {
    this.meter = new Tone.Meter()
    this.tremolo = new Tone.Tremolo({ frequency: 2.5, depth: 0.4 })
    this.reverb = new Tone.Reverb({ decay: 3, wet: 0.45 })
    this.chorus = new Tone.Chorus({ frequency: 0.4, delayTime: 3, depth: 0.5, wet: 0.3 })
    
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 1.5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.008, decay: 0.6, sustain: 0.15, release: 1.2 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.6 },
    })
    this.synth.volume.value = -12
    
    this.synth.connect(this.chorus)
    this.chorus.connect(this.tremolo)
    this.tremolo.connect(this.reverb)
    this.reverb.connect(this.meter)
    this.meter.toDestination()
    
    this.healthUnsub = SystemHealth.getInstance().subscribe((h) => {
      this.tremolo.frequency.rampTo(2 + (1 - h) * 3, 0.5) // Faster tremolo when stressed
    })
  }

  play() {
    if (this.muted || this.isRunning) return
    
    this.tremolo.start()
    this.chorus.start()
    
    this.keysLoop = new Tone.Loop((time) => {
      if (Math.random() > 0.35) {
        const health = SystemHealth.getInstance().health
        const voicings = health > 0.5 ? this.happyVoicings : this.sadVoicings
        const velocity = 0.2 + Math.random() * 0.25
        this.synth.triggerAttackRelease(voicings[this.voicingIndex], "4n", time, velocity)
        this.voicingIndex = (this.voicingIndex + 1) % voicings.length
      }
    }, "2n")
    this.keysLoop.start("0:0:2")
    this.isRunning = true
  }

  stop() {
    this.keysLoop?.stop()
    this.keysLoop?.dispose()
    this.keysLoop = null
    this.tremolo.stop()
    this.chorus.stop()
    this.isRunning = false
  }

  isMuted() { return this.muted }
  mute() { this.muted = true; this.stop() }
  unMute() { this.muted = false }
  dispose() {
    this.healthUnsub?.()
    this.stop()
    this.synth.dispose()
    this.tremolo.dispose()
    this.chorus.dispose()
    this.reverb.dispose()
    this.meter.dispose()
  }
}
