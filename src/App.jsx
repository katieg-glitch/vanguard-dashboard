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

function normalizeBrand(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function aggregateScoreboard(records) {
  const map = {}

  records.forEach((r) => {
    const fields = r.fields || {}

    const displayName = String(
      fields['Contest Salesperson Name'] ||
      fields['Salesperson Name'] ||
      ''
    ).trim()

    const dealer = String(fields['Dealer Name'] || '').trim()

    // If you have Dealer # in Airtable, grab it too (recommended)
    const dealerNumber = String(
      fields['Dealer #'] || fields['Dealer Number'] || fields['Dealer#'] || ''
    ).trim()

    // Brand may come from either field
    const brand = normalizeBrand(fields['Contest Brand'] || fields['Brand'] || '')

    if (!displayName) return

    // ✅ KEY FIX: include dealer (and dealerNumber if you have it)
    const key = `${displayName.toLowerCase()}|${(dealerNumber || dealer).toLowerCase()}`

    if (!map[key]) {
      map[key] = {
        salesperson: displayName,
        dealer: dealer || dealerNumber || '',
        dealerNumber: dealerNumber || '',
        ferris: 0,
        scag: 0,
        wright: 0,
        total: 0,
      }
    }

    if (brand === 'ferris') map[key].ferris += 1
    else if (brand === 'scag') map[key].scag += 1
    else if (brand === 'wright') map[key].wright += 1

    map[key].total = map[key].ferris + map[key].scag + map[key].wright
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
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function PrizeShowcase({ title, subtitle }) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border-yellow-500/20">
      <div className="p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.2em] mb-2">
            Championship Prizes
          </div>
          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="text-sm text-zinc-400 mt-2">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <img
              src={championshipRing}
              alt="Vanguard Championship Ring"
              className="max-h-[260px] w-auto object-contain drop-shadow-[0_0_30px_rgba(234,179,8,0.18)]"
            />
          </div>
          <div className="flex justify-center">
            <img
              src={championshipBelt}
              alt="Vanguard Championship Belt"
              className="max-h-[260px] w-auto object-contain drop-shadow-[0_0_30px_rgba(234,179,8,0.18)]"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function App() {
  const [tab, setTab] = useState('scoreboard')
  const [scoreboard, setScoreboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [error, setError] = useState('')
  const [useDemo, setUseDemo] = useState(false)

  const [formData, setFormData] = useState({
    dealerName: '',
    dealerNumber: '',
    salesperson: '',
    email: '',
    brand: '',
    entries: [{ dateSold: '', serialNumber: '', modelNumber: '' }],
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const [csvData, setCsvData] = useState([])
  const [csvFileName, setCsvFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileRef = useRef(null)

  const refreshScoreboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/airtable')
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response')
      }
      const result = await res.json()
      if (!res.ok || !result.airtableOk) {
        throw new Error(result?.error || result?.airtableData?.error?.message || 'Could not load data')
      }
      const records = result.airtableData?.records
      if (Array.isArray(records) && records.length > 0) {
        const aggregated = aggregateScoreboard(records)
        setScoreboard(aggregated)
      } else {
        setScoreboard([])
      }
      setUseDemo(false)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Failed to fetch scoreboard:', err)
      setScoreboard([])
      setUseDemo(false)
      setError(err.message || 'Failed to load scoreboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshScoreboard()
  }, [refreshScoreboard])

  const addEntry = () => {
    setFormData((p) => ({
      ...p,
      entries: [...p.entries, { dateSold: '', serialNumber: '', modelNumber: '' }],
    }))
  }

  const removeEntry = (i) => {
    setFormData((p) => ({
      ...p,
      entries: p.entries.filter((_, idx) => idx !== i),
    }))
  }

  // ✅ THE FIX: [field] as computed property key
  const updateEntry = (i, field, val) => {
    setFormData((p) => {
      const e = [...p.entries]
      e[i] = { ...e[i], [field]: val }
      return { ...p, entries: e }
    })
  }

  const handleSubmit = async () => {
    if (!formData.dealerName || !formData.salesperson || !formData.brand) {
