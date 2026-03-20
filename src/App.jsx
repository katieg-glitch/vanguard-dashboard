async function loadData(showRefreshState = false) {
  try {
    if (showRefreshState) setRefreshing(true)
    else setLoading(true)

    setError('')

    const res = await fetch('/api/airtable')
    
    // Check if response is JSON before parsing
    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response. Check your API route.')
    }

    const result = await res.json()

    // Validate the response structure
    if (!res.ok) {
      throw new Error(result?.error || `Server error: ${res.status}`)
    }
    
    if (!result.airtableOk) {
      // Airtable-specific errors (invalid API key, wrong base ID, etc.)
      const airtableError = result.airtableData?.error?.message || 'Airtable connection failed'
      throw new Error(airtableError)
    }

    // Safely extract records with validation
    const records = result.airtableData?.records
    if (!Array.isArray(records)) {
      throw new Error('Invalid data format received from Airtable')
    }

    setRecords(records)
  } catch (err) {
    console.error('Load error:', err)
    setError(err.message || 'Could not load leaderboard data.')
    setRecords([])
  } finally {
    setLoading(false)
    setRefreshing(false)
  }
}
