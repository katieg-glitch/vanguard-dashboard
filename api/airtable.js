export default async function handler(req, res) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID
    const TABLE_NAME = 'Vanguard Sweepstakes'
    const VIEW_NAME = 'Grid view'

    // Validate env vars exist
    if (!AIRTABLE_API_KEY || !BASE_ID) {
      return res.status(500).json({
        error: 'Missing Airtable credentials in environment variables',
        airtableOk: false,
      })
    }

    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?view=${encodeURIComponent(VIEW_NAME)}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    })

    const data = await response.json()

    return res.status(200).json({
      airtableStatus: response.status,
      airtableOk: response.ok,
      airtableData: data,
    })
  } catch (err) {
    return res.status(500).json({
      error: 'Server error connecting to Airtable',
      message: err.message,
      airtableOk: false,
    })
  }
}
