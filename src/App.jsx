import React, { useEffect, useMemo, useState } from 'react'

function aggregateLeaderboard(records) {
  const grouped = {}

  for (const record of records) {
    const fields = record.fields || {}
    const salespersonName = String(fields['Salesperson Name'] || 'Unknown').trim()
    const dealerName = String(fields['Dealer Name'] || 'Unknown Dealer').trim()
    const brand = String(fields['Brand'] || '').trim()

    const key = `${salespersonName}__${dealerName}`

    if (!grouped[key]) {
      grouped[key] = {
        salespersonName,
        dealerName,
        ferris: 0,
        wright: 0,
        scag: 0,
        total: 0,
      }
    }

    if (brand === 'Ferris') grouped[key].ferris += 1
    if (brand === 'Wright') grouped[key].wright += 1
    if (brand === 'Scag') grouped[key].scag += 1

    grouped[key].total =
      grouped[key].ferris + grouped[key].wright + grouped[key].scag
  }

  const rows = Object.values(grouped)

  const overallTop3 = [...rows]
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.ferris - a.ferris ||
        b.wright - a.wright ||
        b.scag - a.scag ||
        a.salespersonName.localeCompare(b.salespersonName)
    )
    .slice(0, 3)

  const ferrisTop10 = [...rows]
    .filter((row) => row.ferris > 0)
    .sort(
      (a, b) =>
        b.ferris - a.ferris ||
        b.total - a.total ||
        a.salespersonName.localeCompare(b.salespersonName)
    )
    .slice(0, 10)

  const wrightTop10 = [...rows]
    .filter((row) => row.wright > 0)
    .sort(
      (a, b) =>
        b.wright - a.wright ||
        b.total - a.total ||
        a.salespersonName.localeCompare(b.salespersonName)
    )
    .slice(0, 10)

  const scagTop10 = [...rows]
    .filter((row) => row.scag > 0)
    .sort(
      (a, b) =>
        b.scag - a.scag ||
        b.total - a.total ||
        a.salespersonName.localeCompare(b.salespersonName)
    )
    .slice(0, 10)

  const totals = rows.reduce(
    (acc, row) => {
      acc.ferris += row.ferris
      acc.wright += row.wright
      acc.scag += row.scag
      acc.total += row.total
      return acc
    },
    { ferris: 0, wright: 0, scag: 0, total: 0 }
  )

  return {
    rows,
    totals,
    overallTop3,
    ferrisTop10,
    wrightTop10,
    scagTop10,
  }
}

function Card({ title, value, subtitle }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      {subtitle ? <div style={styles.cardSub}>{subtitle}</div> : null}
    </div>
  )
}

function LeaderboardTable({ title, brandColor, columns, rows, emptyMessage }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={{ ...styles.sectionTitle, color: brandColor }}>{title}</h2>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={styles.th}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.salespersonName}-${row.dealerName}-${index}`} style={styles.tr}>
                  {columns.map((column) => (
                    <td key={column.key} style={styles.td}>
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function App() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    dealerNumber: '',
    dealerName: '',
    salespersonName: '',
    brand: 'Ferris',
    serialNumber: '',
    dateSold: '',
  })

  async function loadData(showRefreshState = false) {
    try {
      if (showRefreshState) setRefreshing(true)
      else setLoading(true)

      setError('')

      const res = await fetch('/api/airtable')
      const result = await res.json()

      if (!res.ok || !result.airtableOk) {
        throw new Error(result?.error || 'Could not load leaderboard data.')
      }

      setRecords(result.airtableData?.records || [])
    } catch (err) {
      console.error(err)
      setError('Could not load leaderboard data.')
      setRecords([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const { totals, overallTop3, ferrisTop10, wrightTop10, scagTop10 } = useMemo(
    () => aggregateLeaderboard(records),
    [records]
  )

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMessage('')

    try {
      const res = await fetch('/api/register-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result?.error || 'Submission failed.')
      }

      setSubmitMessage('Sale submitted successfully.')
      setFormData({
        dealerNumber: '',
        dealerName: '',
        salespersonName: '',
        brand: 'Ferris',
        serialNumber: '',
        dateSold: '',
      })

      await loadData(true)
    } catch (err) {
      console.error(err)
      setSubmitMessage(err.message || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const overallColumns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (_row, index) => <span style={styles.rankBadge}>{index + 1}</span>,
    },
    { key: 'salespersonName', label: 'Salesperson' },
    { key: 'dealerName', label: 'Dealership' },
    { key: 'ferris', label: 'Ferris' },
    { key: 'wright', label: 'Wright' },
    { key: 'scag', label: 'Scag' },
    { key: 'total', label: 'Total' },
  ]

  const ferrisColumns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (_row, index) => <span style={styles.rankBadge}>{index + 1}</span>,
    },
    { key: 'salespersonName', label: 'Salesperson' },
    { key: 'dealerName', label: 'Dealership' },
    { key: 'ferris', label: 'Ferris Sold' },
    { key: 'total', label: 'Overall Total' },
  ]

  const wrightColumns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (_row, index) => <span style={styles.rankBadge}>{index + 1}</span>,
    },
    { key: 'salespersonName', label: 'Salesperson' },
    { key: 'dealerName', label: 'Dealership' },
    { key: 'wright', label: 'Wright Sold' },
    { key: 'total', label: 'Overall Total' },
  ]

  const scagColumns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (_row, index) => <span style={styles.rankBadge}>{index + 1}</span>,
    },
    { key: 'salespersonName', label: 'Salesperson' },
    { key: 'dealerName', label: 'Dealership' },
    { key: 'scag', label: 'Scag Sold' },
    { key: 'total', label: 'Overall Total' },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} />

      <div style={styles.container}>
        <header style={styles.hero}>
<div style={styles.badge}>APP JSX LIVE TEST</div>
<h1 style={styles.title}>Vanguard Power Sweepstakes - NEW BUILD</h1>
          <p style={styles.subtitle}>
            Live leaderboard for Ferris, Wright, and Scag Vanguard engine sales.
          </p>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              style={styles.refreshButton}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </header>

        <section style={styles.cardsGrid}>
          <Card title="Total Units Sold" value={totals.total} />
          <Card title="Ferris Units" value={totals.ferris} />
          <Card title="Wright Units" value={totals.wright} />
          <Card title="Scag Units" value={totals.scag} />
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Register a Sale</h2>
          </div>

          <form onSubmit={handleSubmit} style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Dealer #</label>
              <input
                name="dealerNumber"
                value={formData.dealerNumber}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Dealer Name</label>
              <input
                name="dealerName"
                value={formData.dealerName}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Salesperson Name</label>
              <input
                name="salespersonName"
                value={formData.salespersonName}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Brand</label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                style={styles.input}
                required
              >
                <option value="Ferris">Ferris</option>
                <option value="Wright">Wright</option>
                <option value="Scag">Scag</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Serial #</label>
              <input
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Date Sold</label>
              <input
                type="date"
                name="dateSold"
                value={formData.dateSold}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formActions}>
              <button type="submit" disabled={submitting} style={styles.submitButton}>
                {submitting ? 'Submitting...' : 'Submit Sale'}
              </button>
            </div>

            {submitMessage ? <div style={styles.message}>{submitMessage}</div> : null}
          </form>
        </section>

        {loading ? <div style={styles.notice}>Loading leaderboard...</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}

        {!loading && !error ? (
          <>
            <LeaderboardTable
              title="Overall Top 3"
              brandColor="#facc15"
              columns={overallColumns}
              rows={overallTop3}
              emptyMessage="No overall leaderboard data yet."
            />

            <LeaderboardTable
              title="Ferris Top 10"
              brandColor="#f59e0b"
              columns={ferrisColumns}
              rows={ferrisTop10}
              emptyMessage="No Ferris sales yet."
            />

            <LeaderboardTable
              title="Wright Top 10"
              brandColor="#22c55e"
              columns={wrightColumns}
              rows={wrightTop10}
              emptyMessage="No Wright sales yet."
            />

            <LeaderboardTable
              title="Scag Top 10"
              brandColor="#60a5fa"
              columns={scagColumns}
              rows={scagTop10}
              emptyMessage="No Scag sales yet."
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#f5f5f5',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: 'relative',
    overflowX: 'hidden',
  },
  bgGlow: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(circle at top center, rgba(250,204,21,0.14), transparent 28%), radial-gradient(circle at bottom center, rgba(245,158,11,0.08), transparent 32%)',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    width: 'min(1200px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '40px 0 64px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: 28,
  },
  badge: {
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid rgba(250,204,21,0.25)',
    background: 'rgba(250,204,21,0.08)',
    color: '#facc15',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.12em',
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 'clamp(36px, 5vw, 64px)',
    lineHeight: 1.05,
    fontWeight: 800,
    color: '#facc15',
  },
  subtitle: {
    margin: '14px auto 0',
    maxWidth: 760,
    color: '#bdbdbd',
    fontSize: 18,
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 22,
  },
  refreshButton: {
    background: '#171717',
    color: '#f5f5f5',
    border: '1px solid #2b2b2b',
    borderRadius: 12,
    padding: '12px 18px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  cardsGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    marginBottom: 24,
  },
  card: {
    background: 'rgba(18,18,18,0.95)',
    border: '1px solid #232323',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
  },
  cardLabel: {
    color: '#9b9b9b',
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 12,
    fontWeight: 700,
  },
  cardValue: {
    fontSize: 42,
    fontWeight: 800,
    color: '#facc15',
    lineHeight: 1,
  },
  cardSub: {
    marginTop: 8,
    color: '#8a8a8a',
    fontSize: 14,
  },
  section: {
    background: 'rgba(18,18,18,0.95)',
    border: '1px solid #232323',
    borderRadius: 20,
    padding: 20,
    marginBottom: 22,
    boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: '#ffffff',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 760,
  },
  th: {
    textAlign: 'left',
    padding: '14px 12px',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#9b9b9b',
    borderBottom: '1px solid #2a2a2a',
  },
  tr: {
    borderBottom: '1px solid #1f1f1f',
  },
  td: {
    padding: '16px 12px',
    color: '#f1f1f1',
    fontSize: 15,
  },
  emptyCell: {
    padding: '20px 12px',
    color: '#9b9b9b',
    textAlign: 'center',
  },
  rankBadge: {
    display: 'inline-flex',
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(250,204,21,0.14)',
    border: '1px solid rgba(250,204,21,0.25)',
    color: '#facc15',
    fontWeight: 800,
  },
  formGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: '#bdbdbd',
    fontWeight: 700,
  },
  input: {
    height: 46,
    borderRadius: 12,
    border: '1px solid #2d2d2d',
    background: '#111111',
    color: '#ffffff',
    padding: '0 14px',
    outline: 'none',
  },
  formActions: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  submitButton: {
    background: '#facc15',
    color: '#111111',
    border: 'none',
    borderRadius: 12,
    padding: '12px 18px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  message: {
    gridColumn: '1 / -1',
    color: '#86efac',
    fontWeight: 700,
  },
  notice: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 14,
    background: 'rgba(250,204,21,0.08)',
    border: '1px solid rgba(250,204,21,0.2)',
    color: '#facc15',
    fontWeight: 700,
  },
  error: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 14,
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: '#fca5a5',
    fontWeight: 700,
  },
}
