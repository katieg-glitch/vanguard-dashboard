import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Trophy,
  Plus,
  Trash2,
  Star,
  Upload,
  RefreshCw,
  Award,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Medal,
} from 'lucide-react'
import logo from '../Vanguard-logo.png'
import paceLogo from '../Pace Logo White 2023.png'
import championshipRing from '../Ring.png'
import championshipBelt from '../Belt.png'

const BRANDS = ['Ferris', 'Scag', 'Wright']

// ✅ FIX: normalize Brand values like "Scag Midwest" / "Scag West & CA" => "scag"
function normalizeBrand(raw) {
  if (Array.isArray(raw)) raw = raw[0] || ''

  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

  if (!s) return ''
  if (s.includes('ferris')) return 'ferris'
  if (s.includes('scag')) return 'scag'
  if (s.includes('wright')) return 'wright'
  return s
}

// ✅ FIX: ignore records where salesperson name is "." (placeholder in your Airtable export)
function aggregateScoreboard(records) {
  const map = {}

  const isDotPlaceholder = (name) => {
    const cleaned = String(name || '').trim().replace(/\s+/g, '')
    return cleaned === '.'
  }

  records.forEach((r) => {
    const fields = r.fields || {}

    // Prefer full name first, then fallback
    const fullName = String(fields['Salesperson Name'] || '').trim()
    const contestName = String(fields['Contest Salesperson Name'] || '').trim()
    const displayName = fullName || contestName

    if (!displayName || isDotPlaceholder(displayName)) return

    const dealer = String(fields['Dealer Name'] || '').trim()

    // Prefer Contest Brand if present, else Brand
    const brand = normalizeBrand(fields['Contest Brand'] || fields['Brand'] || '')

    if (!map[displayName.toLowerCase()]) {
      map[displayName.toLowerCase()] = {
        salesperson: displayName,
        dealer,
        ferris: 0,
        scag: 0,
        wright: 0,
        total: 0,
      }
    }

    if (brand === 'ferris') {
      map[displayName.toLowerCase()].ferris += 1
    } else if (brand === 'scag') {
      map[displayName.toLowerCase()].scag += 1
    } else if (brand === 'wright') {
      map[displayName.toLowerCase()].wright += 1
    }

    map[displayName.toLowerCase()].total =
      map[displayName.toLowerCase()].ferris +
      map[displayName.toLowerCase()].scag +
      map[displayName.toLowerCase()].wright
  })

  return Object.values(map).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.salesperson.localeCompare(b.salesperson)
  })
}

function parseCSV(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    const vals = []
    let current = ''
    let inQuotes = false

    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (ch === ',' && !inQuotes) {
        vals.push(current.trim())
        current = ''
        continue
      }
      current += ch
    }

    vals.push(current.trim())

    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = vals[i] || ''
    })
    return obj
  })
}

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-extrabold text-sm text-black shadow-lg shadow-yellow-500/30">
        <Crown className="w-5 h-5" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center font-extrabold text-sm text-gray-900">
        <Medal className="w-5 h-5" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center font-extrabold text-sm text-white">
        <Medal className="w-5 h-5" />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-500">
      {rank}
    </div>
  )
}

function TabButton({ active, children, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all duration-200 ${
        active
          ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-yellow-500 text-black',
    outline: 'border border-yellow-500/30 text-yellow-500/80 bg-transparent',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`bg-zinc-800 animate-pulse rounded ${className}`} />
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: rows }).map((_, i) => (
