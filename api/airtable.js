export default async function handler(req, res) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID
    const TABLE_NAME = 'Vanguard Sweepstakes'

    if (!AIRTABLE_API_KEY || !BASE_ID) {
      return res.status(500).json({
        error: 'Missing Airtable credentials in environment variables',
        airtableOk: false,
      })
    }

    const records = []
    let offset = null

    do {
      const params = new URLSearchParams({
        pageSize: '100',
      })

      if (offset) params.append('offset', offset)

      const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return res.status(response.status).json({
          airtableOk: false,
          error: data?.error?.message || 'Failed to fetch Airtable records',
          airtableData: data,
        })
      }

      if (Array.isArray(data.records)) {
        records.push(...data.records)
      }

      offset = data.offset || null
    } while (offset)

    return res.status(200).json({
      airtableOk: true,
      airtableData: {
        records,
      },
    })
  } catch (err) {
    return res.status(500).json({
      error: 'Server error connecting to Airtable',
      message: err.message,
      airtableOk: false,
    })
  }
}
