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

const BRANDS = ['Ferris', 'Scag', 'Wright']

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

    const brand = String(
      fields['Contest Brand'] ||
        fields['Brand'] ||
        ''
    )
      .trim()
      .toLowerCase()

    if (!displayName) return

    const key = displayName.toLowerCase()

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

    if (brand === 'ferris') {
      map[key].ferris += 1
    } else if (brand === 'scag') {
      map[key].scag += 1
    } else if (brand === 'wright') {
      map[key].wright += 1
    }

    map[key].total = map[key].ferris + map[key].scag + map[key].wright
  })

  return Object.values(map).sort((a, b) => b.total - a.total)
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
    entries: [{ dateSold: '', serialNumber: '' }],
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
      entries: [...p.entries, { dateSold: '', serialNumber: '' }],
    }))
  }

  const removeEntry = (i) => {
    setFormData((p) => ({
      ...p,
      entries: p.entries.filter((_, idx) => idx !== i),
    }))
  }

  const updateEntry = (i, field, val) => {
    setFormData((p) => {
      const e = [...p.entries]
      e[i] = { ...e[i], [field]: val }
      return { ...p, entries: e }
    })
  }

  const handleSubmit = async () => {
    if (!formData.dealerName || !formData.salesperson || !formData.brand) {
      setSubmitMessage('Dealer name, salesperson name, and brand are required.')
      return
    }

    setSubmitting(true)
    setSubmitMessage('')

    try {
      const records = formData.entries
        .filter((e) => e.serialNumber.trim())
        .map((e) => ({
          dealerNumber: formData.dealerNumber,
          dealerName: formData.dealerName,
          salespersonName: formData.salesperson,
          email: formData.email,
          brand: formData.brand,
          serialNumber: e.serialNumber,
          dateSold: e.dateSold,
        }))

      if (!records.length) {
        throw new Error('Add at least one serial number before submitting.')
      }

      for (const record of records) {
        const res = await fetch('/api/register-sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result?.error || 'Submission failed')
        }
      }

      setSubmitted(true)

      setTimeout(() => {
        setSubmitted(false)
        setFormData({
          dealerName: '',
          dealerNumber: '',
          salesperson: '',
          email: '',
          brand: '',
          entries: [{ dateSold: '', serialNumber: '' }],
        })
        refreshScoreboard(true)
      }, 2000)
    } catch (err) {
      console.error('Error submitting:', err)
      setSubmitMessage(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)
    setUploadResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => setCsvData(parseCSV(ev.target.result))
    reader.readAsText(file)
  }

  const downloadCsvTemplate = () => {
    const headers = [
      'Dealer #',
      'Dealer Name',
      'Salesperson Name',
      'Email',
      'Brand',
      'Date Sold',
      'Serial Number',
    ]

    const csvContent = `${headers.join(',')}\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'vanguard-sweepstakes-import-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    window.URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async () => {
    if (!csvData.length) return

    setUploading(true)

    try {
      const find = (row, keys) => {
        for (const k of keys) {
          const match = Object.keys(row).find(
            (rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
          )
          if (match && row[match]) return row[match]
        }
        return ''
      }

      const records = csvData.map((row) => ({
        serialNumber: find(row, ['serialnumber', 'serial number', 'serial', 'serial#']),
        dealerName: find(row, ['dealername', 'dealer name', 'dealer']),
        dealerNumber: find(row, ['dealernumber', 'dealer #', 'dealer#', 'dealernum']),
        salespersonName: find(row, ['salespersonname', 'salesperson name', 'salesperson', 'rep', 'repname']),
        email: find(row, ['email', 'emailaddress']),
        brand: find(row, ['brand']),
        dateSold: find(row, ['datesold', 'date sold', 'date', 'saledate']),
      }))

      for (const record of records) {
        if (!record.serialNumber || !record.salespersonName || !record.brand) continue

        await fetch('/api/register-sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })
      }

      setUploadResult({ success: true, count: records.length })
      setCsvData([])
      setCsvFileName('')
      refreshScoreboard(true)
    } catch (err) {
      setUploadResult({ success: false, error: err.message || 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const overallTop3 = useMemo(
    () => [...scoreboard].sort((a, b) => b.total - a.total).slice(0, 3),
    [scoreboard]
  )

  const ferrisTop10 = useMemo(
    () => [...scoreboard].filter((r) => r.ferris > 0).sort((a, b) => b.ferris - a.ferris).slice(0, 10),
    [scoreboard]
  )

  const wrightTop10 = useMemo(
    () => [...scoreboard].filter((r) => r.wright > 0).sort((a, b) => b.wright - a.wright).slice(0, 10),
    [scoreboard]
  )

  const scagTop10 = useMemo(
    () => [...scoreboard].filter((r) => r.scag > 0).sort((a, b) => b.scag - a.scag).slice(0, 10),
    [scoreboard]
  )

  const rankedReps = scoreboard.length
  const qualifiedReps = scoreboard.filter((r) => r.total >= 5).length
  const activeDealers = new Set(scoreboard.map((r) => r.dealer).filter(Boolean)).size

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.08),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(234,179,8,0.04),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
        <header className="pt-8 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              alt="Vanguard Sweepstakes"
              className="h-16 md:h-20 w-auto"
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 mb-4">
            <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
            <span className="text-xs font-bold text-yellow-500 tracking-wider uppercase">2026 Season</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Vanguard Power Sweepstakes
          </h1>

          <p className="text-zinc-400 mt-2">
            Sell Vanguard-powered Ferris, Scag & Wright — win big.
          </p>

          {useDemo && (
            <Badge variant="outline" className="mt-3">
              Demo Mode
            </Badge>
          )}
        </header>

        <nav className="flex justify-center gap-2 mb-8 flex-wrap">
          <TabButton
            active={tab === 'scoreboard'}
            onClick={() => setTab('scoreboard')}
            icon={<Trophy className="w-4 h-4" />}
          >
            Scoreboard
          </TabButton>

          <TabButton
            active={tab === 'register'}
            onClick={() => setTab('register')}
            icon={<Plus className="w-4 h-4" />}
          >
            Register Sales
          </TabButton>

          <TabButton
            active={tab === 'upload'}
            onClick={() => setTab('upload')}
            icon={<Upload className="w-4 h-4" />}
          >
            Bulk Import
          </TabButton>

          <TabButton
            active={tab === 'prizes'}
            onClick={() => setTab('prizes')}
            icon={<Award className="w-4 h-4" />}
          >
            Rewards & Rules
          </TabButton>
        </nav>

        {tab === 'scoreboard' && (
          <div className="space-y-8 animate-fade-up pb-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Sales Reps Ranked
                </div>
                <div className="text-3xl font-extrabold text-yellow-500">{rankedReps}</div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Qualified Reps
                </div>
                <div className="text-3xl font-extrabold text-green-500">{qualifiedReps}</div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Active Dealers
                </div>
                <div className="text-3xl font-extrabold text-blue-500">{activeDealers}</div>
              </Card>
            </div>

            <div className="flex justify-end items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-zinc-500">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}

              <button
                onClick={() => refreshScoreboard(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Card>
              <div className="p-6 border-b border-zinc-800">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Overall Top 3
                </h2>
                <p className="text-sm text-zinc-500">Top salespeople across all brands</p>
              </div>

              <div className="p-6 overflow-x-auto">
                {loading ? (
                  <TableSkeleton rows={3} />
                ) : overallTop3.length ? (
                  <table className="w-full min-w-[420px]">
                    <thead>
                      <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                        <th className="pb-3 w-16">Rank</th>
                        <th className="pb-3">Salesperson</th>
                        <th className="pb-3">Dealership</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallTop3.map((row, i) => (
                        <tr key={i} className="border-t border-zinc-800/50">
                          <td className="py-4">
                            <RankBadge rank={i + 1} />
                          </td>
                          <td className="py-4 font-semibold">{row.salesperson}</td>
                          <td className="py-4 text-zinc-400">{row.dealer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-zinc-500 py-6 text-center">No submissions yet.</p>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="font-bold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Ferris Top 10
                  </h3>
                </div>

                <div className="p-4">
                  {loading ? (
                    <TableSkeleton rows={10} />
                  ) : ferrisTop10.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-500 uppercase">
                          <th className="pb-2 w-10">#</th>
                          <th className="pb-2">Salesperson</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ferrisTop10.map((row, i) => (
                          <tr key={i} className="border-t border-zinc-800/30">
                            <td className="py-2">
                              {i < 3 ? (
                                <RankBadge rank={i + 1} />
                              ) : (
                                <span className="text-zinc-500 pl-3">{i + 1}</span>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="font-medium">{row.salesperson}</div>
                              <div className="text-xs text-zinc-500 truncate max-w-[120px]">
                                {row.dealer}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-zinc-500 py-6 text-center">No Ferris submissions yet.</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="font-bold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    Wright Top 10
                  </h3>
                </div>

                <div className="p-4">
                  {loading ? (
                    <TableSkeleton rows={10} />
                  ) : wrightTop10.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-500 uppercase">
                          <th className="pb-2 w-10">#</th>
                          <th className="pb-2">Salesperson</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wrightTop10.map((row, i) => (
                          <tr key={i} className="border-t border-zinc-800/30">
                            <td className="py-2">
                              {i < 3 ? (
                                <RankBadge rank={i + 1} />
                              ) : (
                                <span className="text-zinc-500 pl-3">{i + 1}</span>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="font-medium">{row.salesperson}</div>
                              <div className="text-xs text-zinc-500 truncate max-w-[120px]">
                                {row.dealer}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-zinc-500 py-6 text-center">No Wright submissions yet.</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="font-bold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    Scag Top 10
                  </h3>
                </div>

                <div className="p-4">
                  {loading ? (
                    <TableSkeleton rows={10} />
                  ) : scagTop10.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-500 uppercase">
                          <th className="pb-2 w-10">#</th>
                          <th className="pb-2">Salesperson</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scagTop10.map((row, i) => (
                          <tr key={i} className="border-t border-zinc-800/30">
                            <td className="py-2">
                              {i < 3 ? (
                                <RankBadge rank={i + 1} />
                              ) : (
                                <span className="text-zinc-500 pl-3">{i + 1}</span>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="font-medium">{row.salesperson}</div>
                              <div className="text-xs text-zinc-500 truncate max-w-[120px]">
                                {row.dealer}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-zinc-500 py-6 text-center">No Scag submissions yet.</p>
                  )}
                </div>
              </Card>
            </div>

            <p className="text-center text-xs text-zinc-500">
              {error ? 'Unable to load Airtable data.' : 'Live results from Airtable.'}
            </p>
          </div>
        )}

        {tab === 'register' && (
          <div className="max-w-2xl mx-auto animate-fade-up pb-12">
            {submitted ? (
              <Card className="text-center py-12 px-6">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Submission Received!</h2>
                <p className="text-zinc-400">Your sales entries have been recorded.</p>
              </Card>
            ) : (
              <Card>
                <div className="p-6 border-b border-zinc-800">
                  <h2 className="text-xl font-bold text-yellow-500">Register Unit Sales</h2>
                  <p className="text-sm text-zinc-500">
                    Submit your Vanguard-powered unit sales. Each serial number = 1 entry.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Dealer Name</label>
                      <input
                        type="text"
                        placeholder="e.g. ProCut Equipment"
                        value={formData.dealerName}
                        onChange={(e) => setFormData((p) => ({ ...p, dealerName: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Dealer #</label>
                      <input
                        type="text"
                        placeholder="e.g. D-10423"
                        value={formData.dealerNumber}
                        onChange={(e) => setFormData((p) => ({ ...p, dealerNumber: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Salesperson Name</label>
                      <input
                        type="text"
                        placeholder="Full name"
                        value={formData.salesperson}
                        onChange={(e) => setFormData((p) => ({ ...p, salesperson: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                      <input
                        type="email"
                        placeholder="you@dealer.com"
                        value={formData.email}
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Brand</label>
                    <div className="flex gap-3">
                      {BRANDS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, brand: b }))}
                          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                            formData.brand === b
                              ? 'bg-yellow-500 text-black shadow-lg'
                              : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-yellow-500/50'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">Unit Sales</h3>
                        <p className="text-xs text-zinc-500">Add each unit with date and serial number</p>
                      </div>

                      <button
                        onClick={addEntry}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-sm font-medium hover:bg-yellow-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Unit
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.entries.map((entry, i) => (
                        <div key={i} className="flex gap-3 items-end">
                          <div className="flex-1">
                            {i === 0 && <label className="block text-xs text-zinc-500 mb-1">Date Sold</label>}
                            <input
                              type="date"
                              value={entry.dateSold}
                              onChange={(e) => updateEntry(i, 'dateSold', e.target.value)}
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                            />
                          </div>

                          <div className="flex-[1.5]">
                            {i === 0 && <label className="block text-xs text-zinc-500 mb-1">Serial Number</label>}
                            <input
                              type="text"
                              placeholder="e.g. VG-2026-XXXXX"
                              value={entry.serialNumber}
                              onChange={(e) => updateEntry(i, 'serialNumber', e.target.value)}
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                            />
                          </div>

                          {formData.entries.length > 1 && (
                            <button
                              onClick={() => removeEntry(i)}
                              className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-zinc-500 mt-2">
                      {formData.entries.length} unit{formData.entries.length !== 1 ? 's' : ''} — each creates a separate record
                    </p>
                  </div>

                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-500/80">
                        <strong className="text-yellow-500">Disclaimer:</strong> Documentation for all sales,
                        including invoices and equipment registrations, will be required in order to claim any reward.
                      </p>
                    </div>
                  </div>

                  {submitMessage && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                      {submitMessage}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !formData.dealerName || !formData.salesperson || !formData.brand}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Sales Entries'}
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto animate-fade-up pb-12">
            <Card>
              <div className="p-6 border-b border-zinc-800">
                <h2 className="text-xl font-bold text-yellow-500">Bulk Import SPIFFs</h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Upload a CSV of existing qualified records to push them in batch.
                </p>

                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Download CSV Template
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Expected CSV Columns
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['Dealer #', 'Dealer Name', 'Salesperson Name', 'Email', 'Brand', 'Date Sold', 'Serial Number'].map((col) => (
                      <Badge key={col} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-500 mt-3">
                    Column headers are matched flexibly — "Salesperson Name", "salesperson", or "Rep" all work.
                  </p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-10 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer text-zinc-400 hover:border-yellow-500 hover:text-yellow-500 transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="w-6 h-6" />
                  <span className="font-medium">{csvFileName || 'Click to select CSV file'}</span>
                </button>

                {csvData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Preview ({csvData.length} records)</h3>

                      <button
                        onClick={() => {
                          setCsvData([])
                          setCsvFileName('')
                        }}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-700"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="border border-zinc-700 rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-800">
                          <tr>
                            {Object.keys(csvData[0]).map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-xs text-zinc-400 font-medium">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {csvData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t border-zinc-800">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="px-3 py-2 text-xs">
                                  {String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {csvData.length > 5 && (
                        <div className="text-center text-xs text-zinc-500 py-2 border-t border-zinc-800">
                          ...and {csvData.length - 5} more rows
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleBulkUpload}
                      disabled={uploading}
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploading ? `Uploading ${csvData.length} records...` : `Push ${csvData.length} Records`}
                    </button>
                  </div>
                )}

                {uploadResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      uploadResult.success
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    {uploadResult.success ? (
                      <p className="text-green-500 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Successfully uploaded {uploadResult.count} records!
                      </p>
                    ) : (
                      <p className="text-red-400 font-medium">Upload failed: {uploadResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === 'prizes' && (
          <div className="space-y-6 animate-fade-up pb-12">
            <div className="text-center py-8">
              <div className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Total Rewards
              </div>
              <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                $30,000
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Sweepstakes Raffle — Per Brand
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BRANDS.map((brand) => (
                  <Card key={brand} className="text-center p-6">
                    <div className="text-lg font-bold mb-1">{brand}</div>
                    <div className="text-3xl font-black text-yellow-500">$7,500</div>
                    <div className="text-sm text-zinc-400 mt-2">10 winners × $750 each</div>
                    <div className="text-xs text-zinc-500">Live raffle drawing</div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
                Brand Champion Awards
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Top sales rep per brand at year end — 3 winners total
              </p>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center text-xl">
                    💰
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-500">$1,500</div>
                    <div className="text-xs text-zinc-500">Cash per winner</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <div>
                    <div className="font-semibold">Commemorative Award</div>
                    <div className="text-xs text-zinc-500">Plaque or Championship Ring</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/30">
              <Badge className="mb-2">Grand Prize</Badge>
              <h3 className="text-xl font-bold text-yellow-500 mb-1">
                2026 Pace Vanguard Power Champion
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Highest total Vanguard unit sales across all brands
              </p>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div>
                    <div className="text-xl font-bold text-yellow-500">$3,000</div>
                    <div className="text-xs text-zinc-500">Cash Award</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥊</span>
                  <div>
                    <div className="font-bold text-yellow-500">Championship Belt</div>
                    <div className="text-xs text-zinc-500">Custom Exclusive</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl">👑</span>
                  <div>
                    <div className="font-bold text-yellow-500">Power Champion</div>
                    <div className="text-xs text-zinc-500">Official Title</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">How It Works</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    step: '01',
                    title: 'Sell 5+ Vanguard-powered units',
                    desc: 'Any combo of Ferris, Scag, and Wright mowers qualifies you.',
                  },
                  {
                    step: '02',
                    title: 'Every unit = 1 entry',
                    desc: 'No cap. More sales, better odds.',
                  },
                  {
                    step: '03',
                    title: 'Submit via this portal',
                    desc: 'Enter serial numbers and sale dates. Each record is tracked separately.',
                  },
                  {
                    step: '04',
                    title: 'Win in the live raffle',
                    desc: '10 winners per brand at $750 each. Brand Champions and Overall Champion named at year end.',
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
                  >
                    <div className="text-xs font-bold tracking-[0.2em] text-yellow-500 mb-2">
                      {s.step}
                    </div>
                    <h4 className="text-lg font-semibold mb-2">{s.title}</h4>
                    <p className="text-sm text-zinc-400">{s.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Program Notes</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>• Sales must be submitted with valid serial numbers.</li>
                <li>• Documentation may be required before any payout is issued.</li>
                <li>• Leaderboard rankings update automatically.</li>
                <li>• Final prize decisions are subject to program verification.</li>
                <li>• Any participant awarded a Top Salesperson prize will be excluded from the $750 raffle drawing. </li>
              </ul>
            </Card>
          </div>
        )}

        <footer className="py-10 border-t border-zinc-900 text-center">
          <div className="flex justify-center mb-4">
            <img
              src={paceLogo}
              alt="Pace"
              className="h-8 md:h-10 w-auto opacity-90"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Powered by Pace. Vanguard Sweepstakes Portal.
          </p>
        </footer>
      </div>
    </div>
  )
}
