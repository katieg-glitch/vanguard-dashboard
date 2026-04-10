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
const BRAND_KEYS = ['ferris', 'scag', 'wright']

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

function isTruthy(value) {
  if (value === true || value === 1) return true
  const s = String(value || '').trim().toLowerCase()
  return ['true', 'yes', 'y', '1', 'checked', 'x'].includes(s)
}

function isDotPlaceholder(name) {
  const cleaned = String(name || '').trim().replace(/\s+/g, '')
  return cleaned === '.'
}

function isDuplicateRecord(fields) {
  return [
    fields['Duplicate'],
    fields['Duplicate?'],
    fields['Is Duplicate'],
    fields['Duplicate Record'],
    fields['Mark Duplicate'],
  ].some(isTruthy)
}

function isQualifiedRecord(fields) {
  const explicitQualification = [
    'Qualified',
    'Qualified Unit',
    'Is Qualified',
    'Contest Qualified',
  ].find((key) => key in fields)

  if (explicitQualification) {
    return isTruthy(fields[explicitQualification])
  }

  return true
}

function buildScoreRows(records) {
  const map = {}

  records.forEach((record) => {
    const fields = record?.fields || record || {}

    if (isDuplicateRecord(fields)) return
    if (!isQualifiedRecord(fields)) return

    const contestName = String(fields['Contest Salesperson Name'] || '').trim()
    const fullName = String(fields['Salesperson Name'] || '').trim()
    const displayName = !isDotPlaceholder(contestName)
      ? contestName
      : !isDotPlaceholder(fullName)
        ? fullName
        : ''

    if (!displayName) return

    const dealer = String(fields['Dealer Name'] || fields['Dealer'] || '').trim()
    const brand = normalizeBrand(fields['Contest Brand'] || fields['Brand'] || '')

    if (!BRAND_KEYS.includes(brand)) return

    const key = `${displayName.toLowerCase()}__${dealer.toLowerCase()}`

    if (!map[key]) {
      map[key] = {
        salesperson: displayName,
        dealer,
        ferris: 0,
        scag: 0,
        wright: 0,
        total: 0,
      }
    }

    map[key][brand] += 1
    map[key].total = map[key].ferris + map[key].scag + map[key].wright
  })

  return Object.values(map)
}

function sortRows(rows, key) {
  return [...rows]
    .filter((row) => row[key] > 0)
    .sort((a, b) => {
      if (b[key] !== a[key]) return b[key] - a[key]
      if (b.total !== a.total) return b.total - a.total
      return a.salesperson.localeCompare(b.salesperson)
    })
}

function aggregateScoreboard(records) {
  const rows = buildScoreRows(records)

  return {
    rows,
    overall: sortRows(rows, 'total'),
    ferris: sortRows(rows, 'ferris'),
    scag: sortRows(rows, 'scag'),
    wright: sortRows(rows, 'wright'),
  }
}

function parseCSV(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const parseLine = (line) => {
    const vals = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      const next = line[i + 1]

      if (ch === '"') {
        if (inQuotes && next === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
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
    return vals
  }

  const headers = parseLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    const vals = parseLine(line)
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
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/30">
        <Crown className="h-5 w-5" />
      </div>
    )
  }

  if (rank === 2) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900">
        <Medal className="h-5 w-5" />
      </div>
    )
  }

  if (rank === 3) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white">
        <Medal className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 font-bold text-sm text-zinc-500">
      {rank}
    </div>
  )
}

function TabButton({ active, children, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 ${className}`}>
      {children}
    </div>
  )
}

function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-yellow-500 text-black',
    outline: 'border border-yellow-500/30 bg-transparent text-yellow-500/80',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[60px,1.5fr,1fr,80px] gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ))}
    </div>
  )
}

function ScoreTable({ title, rows, scoreKey, hideUnits }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>

      <div className="divide-y divide-zinc-800">
        {rows.length === 0 ? (
          <div className="px-6 py-6 text-sm text-zinc-400">No qualified contestants to show yet.</div>
        ) : (
          rows.map((row, index) => (
            <div key={`${title}-${row.salesperson}-${row.dealer}-${index}`} className="grid grid-cols-[56px,1.4fr,1fr,90px] items-center gap-3 px-6 py-4">
              <RankBadge rank={index + 1} />
              <div>
                <div className="font-semibold text-white">{row.salesperson}</div>
                <div className="text-sm text-zinc-400">{row.dealer || 'No dealer listed'}</div>
              </div>
              <div className="text-sm text-zinc-400">
                F {row.ferris} · S {row.scag} · W {row.wright}
              </div>
              <div className="text-right text-lg font-extrabold text-yellow-400">
                {hideUnits ? '—' : row[scoreKey]}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('scoreboard')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [hideUnits, setHideUnits] = useState(false)
  const [minQualifiedUnits, setMinQualifiedUnits] = useState(5)

  const [salesEntry, setSalesEntry] = useState({
    salesperson: '',
    dealer: '',
    brand: BRANDS[0],
    serial: '',
    dateSold: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [csvText, setCsvText] = useState('')
  const [importPreview, setImportPreview] = useState([])
  const fileInputRef = useRef(null)

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/airtable', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)

      const data = await res.json()
      const nextRecords = Array.isArray(data)
        ? data
        : Array.isArray(data?.records)
          ? data.records
          : []

      setRecords(nextRecords)
      setLastUpdated(new Date().toLocaleString())
    } catch (err) {
      setError(err.message || 'Failed to load scoreboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const scoreboard = useMemo(() => aggregateScoreboard(records), [records])

  const visibleScoreboard = useMemo(() => {
    const filterRows = (rows) => rows.filter((row) => row.total >= minQualifiedUnits)

    return {
      overall: filterRows(scoreboard.overall),
      ferris: filterRows(scoreboard.ferris),
      scag: filterRows(scoreboard.scag),
      wright: filterRows(scoreboard.wright),
    }
  }, [scoreboard, minQualifiedUnits])

  const topThreeOverall = visibleScoreboard.overall.slice(0, 3)

  const handleEntryChange = (field, value) => {
    setSalesEntry((prev) => ({ ...prev, [field]: value }))
  }

  const submitSale = async (event) => {
    event.preventDefault()
    setSaveMessage('')

    try {
      setSaving(true)
      const payload = {
        fields: {
          'Contest Salesperson Name': salesEntry.salesperson,
          'Dealer Name': salesEntry.dealer,
          'Contest Brand': salesEntry.brand,
          'Serial #': salesEntry.serial,
          'Date Sold': salesEntry.dateSold,
        },
      }

      const res = await fetch('/api/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`Save failed: ${res.status}`)

      setSalesEntry({
        salesperson: '',
        dealer: '',
        brand: BRANDS[0],
        serial: '',
        dateSold: '',
      })
      setSaveMessage('Sale saved.')
      await loadRecords()
    } catch (err) {
      setSaveMessage(err.message || 'Could not save sale.')
    } finally {
      setSaving(false)
    }
  }

  const handleCSVFile = async (file) => {
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    setImportPreview(parseCSV(text))
  }

  const bulkRows = useMemo(() => parseCSV(csvText), [csvText])
  const bulkScoreboard = useMemo(() => aggregateScoreboard(bulkRows), [bulkRows])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Vanguard" className="h-14 w-auto object-contain" />
              <div>
                <Badge className="mb-2">2026 Season</Badge>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Vanguard Power Sweepstakes</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-300 sm:text-base">
                  Live leaderboard for Ferris, Scag, and Wright Vanguard engine sales.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <img src={paceLogo} alt="Pace" className="h-10 w-auto object-contain opacity-90" />
              <button
                onClick={loadRecords}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <TabButton active={activeTab === 'scoreboard'} onClick={() => setActiveTab('scoreboard')} icon={<Trophy className="h-4 w-4" />}>
            Scoreboard
          </TabButton>
          <TabButton active={activeTab === 'register'} onClick={() => setActiveTab('register')} icon={<Plus className="h-4 w-4" />}>
            Register Sales
          </TabButton>
          <TabButton active={activeTab === 'bulk'} onClick={() => setActiveTab('bulk')} icon={<Upload className="h-4 w-4" />}>
            Bulk Import
          </TabButton>
          <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} icon={<Award className="h-4 w-4" />}>
            Rewards & Rules
          </TabButton>
        </div>

        {activeTab === 'scoreboard' && (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.4fr,0.8fr]">
              <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-semibold text-yellow-400">Overall Top 3</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Contestants appear after at least {minQualifiedUnits} qualified units.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
                    <label className="flex items-center gap-2">
                      <span>Minimum units</span>
                      <input
                        type="number"
                        min="1"
                        className="w-20 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                        value={minQualifiedUnits}
                        onChange={(e) => setMinQualifiedUnits(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hideUnits}
                        onChange={(e) => setHideUnits(e.target.checked)}
                      />
                      Hide units sold
                    </label>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-sm text-zinc-400">Last updated</div>
                <div className="mt-1 text-lg font-bold text-white">{lastUpdated || '—'}</div>
                <div className="mt-3 text-sm text-zinc-400">
                  Duplicate-marked records are ignored. Scoreboard uses <span className="font-semibold text-zinc-200">Contest Salesperson Name</span> first.
                </div>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {topThreeOverall.map((row, index) => (
                <Card key={`${row.salesperson}-${row.dealer}-${index}`} className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <RankBadge rank={index + 1} />
                    <Badge variant="outline">{row.dealer || 'No dealer listed'}</Badge>
                  </div>
                  <div className="text-xl font-black text-white">{row.salesperson}</div>
                  <div className="mt-2 text-sm text-zinc-400">Ferris {row.ferris} · Scag {row.scag} · Wright {row.wright}</div>
                  <div className="mt-4 text-3xl font-black text-yellow-400">{hideUnits ? '—' : row.total}</div>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <img src={championshipRing} alt="Championship ring" className="h-56 w-full rounded-2xl border border-zinc-800 object-contain bg-zinc-950 p-4" />
              <img src={championshipBelt} alt="Championship belt" className="h-56 w-full rounded-2xl border border-zinc-800 object-contain bg-zinc-950 p-4" />
            </div>

            {error ? (
              <Card className="border-red-900 bg-red-950/30 p-5">
                <div className="flex items-start gap-3 text-red-300">
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                  <div>
                    <div className="font-semibold">Could not load scoreboard</div>
                    <div className="text-sm">{error}</div>
                  </div>
                </div>
              </Card>
            ) : loading ? (
              <Card className="p-6">
                <TableSkeleton rows={6} />
              </Card>
            ) : (
              <div className="grid gap-6 xl:grid-cols-2">
                <ScoreTable title="Overall" rows={visibleScoreboard.overall} scoreKey="total" hideUnits={hideUnits} />
                <ScoreTable title="Ferris" rows={visibleScoreboard.ferris} scoreKey="ferris" hideUnits={hideUnits} />
                <ScoreTable title="Scag" rows={visibleScoreboard.scag} scoreKey="scag" hideUnits={hideUnits} />
                <ScoreTable title="Wright" rows={visibleScoreboard.wright} scoreKey="wright" hideUnits={hideUnits} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <Card className="max-w-3xl p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black">Register Sales</h2>
              <p className="mt-2 text-sm text-zinc-400">Adds one sale record using Contest Salesperson Name, dealer, brand, serial number, and sold date.</p>
            </div>

            <form onSubmit={submitSale} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Contest Salesperson Name</span>
                <input
                  required
                  value={salesEntry.salesperson}
                  onChange={(e) => handleEntryChange('salesperson', e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Dealer Name</span>
                <input
                  value={salesEntry.dealer}
                  onChange={(e) => handleEntryChange('dealer', e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Brand</span>
                <select
                  value={salesEntry.brand}
                  onChange={(e) => handleEntryChange('brand', e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                >
                  {BRANDS.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Date Sold</span>
                <input
                  type="date"
                  value={salesEntry.dateSold}
                  onChange={(e) => handleEntryChange('dateSold', e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-zinc-300">Serial #</span>
                <input
                  value={salesEntry.serial}
                  onChange={(e) => handleEntryChange('serial', e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </label>

              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Sale'}
                </button>
                {saveMessage && <div className="text-sm text-zinc-300">{saveMessage}</div>}
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Bulk Import</h2>
                  <p className="mt-2 text-sm text-zinc-400">Upload a CSV to preview scoreboard math before importing it anywhere permanent.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
                  >
                    <Upload className="h-4 w-4" />
                    Upload CSV
                  </button>
                  <button
                    onClick={() => {
                      setCsvText('')
                      setImportPreview([])
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleCSVFile(e.target.files?.[0])}
              />

              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value)
                  setImportPreview(parseCSV(e.target.value))
                }}
                placeholder="Paste CSV here if you don't want to upload a file."
                className="min-h-[220px] w-full rounded-2xl border border-zinc-700 bg-black p-4 font-mono text-sm text-white"
              />
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <ScoreTable title="Preview Overall" rows={bulkScoreboard.overall.filter((row) => row.total >= minQualifiedUnits)} scoreKey="total" hideUnits={hideUnits} />
              <Card className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <h3 className="text-lg font-bold">Import Preview</h3>
                </div>
                <div className="text-sm text-zinc-400">Parsed rows: {importPreview.length}</div>
                <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-zinc-950 text-zinc-300">
                      <tr>
                        {Object.keys(importPreview[0] || {}).map((key) => (
                          <th key={key} className="border-b border-zinc-800 px-3 py-2 font-semibold">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 25).map((row, idx) => (
                        <tr key={idx} className="border-b border-zinc-900">
                          {Object.keys(importPreview[0] || {}).map((key) => (
                            <td key={`${idx}-${key}`} className="px-3 py-2 text-zinc-300">{row[key]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-400" />
                <h2 className="text-2xl font-black">Rewards & Rules</h2>
              </div>

              <div className="space-y-4 text-sm leading-6 text-zinc-300">
                <p>
                  The live scoreboard adds qualified Ferris, Scag, and Wright Vanguard engine sales together for the overall standings.
                </p>
                <p>
                  Brand leaderboards rank each contestant only on that brand’s units. The overall board ranks by total units across all three brands.
                </p>
                <p>
                  Duplicate-marked records are ignored. Placeholder salesperson names like a single period are ignored too.
                </p>
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100">
                  If you win the top sales prizes, you’re no longer eligible for the $750 raffle.
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <img src={championshipRing} alt="Championship ring prize" className="h-64 w-full rounded-2xl border border-zinc-800 object-contain bg-zinc-950 p-4" />
              <img src={championshipBelt} alt="Championship belt prize" className="h-64 w-full rounded-2xl border border-zinc-800 object-contain bg-zinc-950 p-4" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

