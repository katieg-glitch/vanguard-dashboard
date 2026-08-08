export default async function handler(req, res) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID
    const TABLE_ID = process.env.AIRTABLE_TABLE_ID
    // IMPORTANT: This tells Airtable which VIEW to pull records from.
    // Without this, Airtable ignores your Grid view's filters (like your
    // duplicate-serial-number filter) and returns EVERY record in the table.
    //
    // Defaults to your confirmed Grid view ID (from
    // https://airtable.com/app4bcZHXtQ7OvxDB/tblUTq9WqezZWWnVZ/viw6LEMYw0BdmeYKN)
    // so this works immediately. You can still override it via the
    // AIRTABLE_VIEW_ID environment variable if you ever need to point at a
    // different view without redeploying code.
    const VIEW_ID = process.env.AIRTABLE_VIEW_ID || 'viw6LEMYw0BdmeYKN'

    if (!AIRTABLE_API_KEY || !BASE_ID || !TABLE_ID) {
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
        view: VIEW_ID,
      })

      if (offset) params.append('offset', offset)

      const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`

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
      airtableData: { records },
    })
  } catch (err) {
    return res.status(500).json({
      error: 'Server error connecting to Airtable',
      message: err.message,
      airtableOk: false,
    })
  }
}

