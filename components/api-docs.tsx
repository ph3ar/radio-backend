"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Code, Copy, Check, ChevronDown, ChevronUp } from "lucide-react"

export function ApiDocs() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const curlExample = `curl -X POST ${baseUrl}/api/events \\
  -H "Content-Type: application/json" \\
  -d '[
    {
      "time": "2026-01-19 18:48:30",
      "badge_code": "Ziggy",
      "destination": "Charge 7",
      "duration_sec": 0,
      "event_type": "TASK_START",
      "robot_id": "xap035",
      "task_id": "b98843f3-3629-4f1a-a52e-fec620fb45fe"
    },
    {
      "time": "2026-01-19 18:34:57",
      "badge_code": "Parcel Load Queue",
      "destination": "Parcel Load Queue",
      "duration_sec": 0,
      "event_type": "TASK_START",
      "robot_id": "xap043",
      "task_id": "cb0efe3c-6e5c-49f9-abd2-9733fcee1385"
    }
  ]'`

  const pythonExample = `import requests
from datetime import datetime

# Your robot events (same format as your data export)
events = [
    {
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "badge_code": "Ziggy",
        "destination": "Parcel Load Que",
        "duration_sec": 0,
        "event_type": "TASK_START",
        "robot_id": "xap035",
        "task_id": "b98843f3-3629-4f1a-a52e-fec620fb45fe"
    },
    {
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "badge_code": "Ziggy",
        "destination": "Parcel Load Queue",
        "duration_sec": 0,
        "event_type": "TASK_START",
        "robot_id": "xap043",
        "task_id": "cb0efe3c-6e5c-49f9-abd2-9733fcee1385"
    }
]

# Send batch of events
response = requests.post(
    "${baseUrl}/api/events",
    json=events
)
print(response.json())  # {"success": true, "count": 2}`

  const jsExample = `// Send events from your backend or script
const events = [
  {
    time: "2026-01-19 18:48:30",
    badge_code: "Ziggy",
    destination: "Export Queue",
    duration_sec: 0,
    event_type: "TASK_START",
    robot_id: "xap035",
    task_id: "b98843f3-3629-4f1a-a52e-fec620fb45fe"
  }
];

await fetch("${baseUrl}/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(events)
});`

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white/80">API Integration</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          <div>
            <p className="text-xs text-white/50 mb-3">
              Send robot events to make the radio respond. POST to:
            </p>
            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
              <code className="text-xs text-cyan-300 flex-1 font-mono">
                POST {baseUrl}/api/events
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(`${baseUrl}/api/events`, "endpoint")}
              >
                {copied === "endpoint" ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 text-white/40" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">cURL</p>
            <div className="relative">
              <pre className="text-[10px] text-white/60 bg-black/30 rounded-lg p-3 overflow-x-auto font-mono">
                {curlExample}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => copyToClipboard(curlExample, "curl")}
              >
                {copied === "curl" ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 text-white/40" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Python</p>
            <div className="relative">
              <pre className="text-[10px] text-white/60 bg-black/30 rounded-lg p-3 overflow-x-auto font-mono">
                {pythonExample}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => copyToClipboard(pythonExample, "python")}
              >
                {copied === "python" ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 text-white/40" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">JavaScript</p>
            <div className="relative">
              <pre className="text-[10px] text-white/60 bg-black/30 rounded-lg p-3 overflow-x-auto font-mono">
                {jsExample}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => copyToClipboard(jsExample, "js")}
              >
                {copied === "js" ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 text-white/40" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-[10px] text-white/30 pt-2 border-t border-white/5 space-y-3">
            <div>
              <p className="font-medium text-white/50 mb-1">Event fields:</p>
              <ul className="space-y-0.5">
                <li><code className="text-cyan-400/60">robot_id</code> (required) - e.g. "xap035", "xap043"</li>
                <li><code className="text-cyan-400/60">event_type</code> (required) - see sound mappings below</li>
                <li><code className="text-cyan-400/60">goto_outcome</code> - affects sound for TASK_END events</li>
                <li><code className="text-cyan-400/60">time</code>, <code className="text-cyan-400/60">task_id</code>, <code className="text-cyan-400/60">destination</code>, <code className="text-cyan-400/60">badge_code</code>, <code className="text-cyan-400/60">duration_sec</code></li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-green-400/70 mb-1">Good sounds (coins):</p>
              <ul className="space-y-0.5">
                <li><code className="text-green-400/60">TASK_START</code> - Bright coin drops</li>
                <li><code className="text-green-400/60">LOGIN</code> - Ascending coin cascade</li>
                <li><code className="text-green-400/60">TASK_END</code> + COMPLETED - Warm bell</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-red-400/70 mb-1">Bad sounds (degraded):</p>
              <ul className="space-y-0.5">
                <li><code className="text-red-400/60">LOGOUT</code> - Descending sad tone</li>
                <li><code className="text-red-400/60">E_STOP</code>, <code className="text-red-400/60">EMERGENCY</code> - Harsh noise burst</li>
                <li><code className="text-red-400/60">TASK_CANCELLED</code> - Gritty warning</li>
                <li><code className="text-orange-400/60">goto_outcome</code>: INACTIVE, ABORTED, ABORTED_VIA_TOUCHSCREEN - Warning tone</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
