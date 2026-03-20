export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const BASE_ID = process.env.AIRTABLE_BASE_ID
const TABLE_ID = process.env.AIRTABLE_TABLE_ID

    if (!AIRTABLE_API_KEY || !BASE_ID || !TABLE_ID) {
      return res.status(500).json({
        error: 'Missing Airtable credentials in environment variables',
      })
    }

    const {
      dealerNumber,
      dealerName,
      salespersonName,
      email,
      brand,
      serialNumber,
      dateSold,
    } = req.body || {}

    if (!dealerName || !salespersonName || !brand || !serialNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
      })
    }

    const allowedBrands = ['Ferris', 'Scag', 'Wright']
    if (!allowedBrands.includes(brand)) {
      return res.status(400).json({
        error: 'Brand must be Ferris, Scag, or Wright',
      })
    }

    const airtableBody = {
      fields: {
        'Dealer #': dealerNumber || '',
        'Dealer Name': dealerName || '',
        'Salesperson Name': salespersonName || '',
        'Email': email || '',
        'Brand': brand || '',
        'Date Sold': dateSold || '',
        'Serial #': serialNumber || '',
        'Submission Source': 'App',
      },
      typecast: true,
    }

    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableBody),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Failed to create Airtable record',
        airtableData: data,
      })
    }

    return res.status(200).json({
      success: true,
      record: data,
    })
  } catch (err) {
    return res.status(500).json({
      error: 'Server error creating Airtable record',
      message: err.message,
    })
  }
}
