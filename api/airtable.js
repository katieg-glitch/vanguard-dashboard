export default async function handler(req, res) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID
    const TABLE_NAME = 'YOUR_TABLE_NAME' // <-- CHANGE THIS

    if (!AIRTABLE_API_KEY || !BASE_ID) {
      return res.status(500).json({
        error: 'Missing Airtable environment variables',
      })
    }

    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Airtable API error',
        details: data,
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({
      error: 'Server crash',
      message: err.message,
    })
  }
}
