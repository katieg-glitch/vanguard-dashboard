export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID
    const TABLE_NAME = 'Vanguard Sweepstakes'

    const {
      dealerNumber,
      dealerName,
      salespersonName,
      brand,
      serialNumber,
      dateSold,
    } = req.body

    if (
      !dealerNumber ||
      !dealerName ||
      !salespersonName ||
      !brand ||
      !serialNumber ||
      !dateSold
    ) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                'Dealer #': dealerNumber,
                'Dealer Name': dealerName,
                'Salesperson Name': salespersonName,
                'Brand': brand,
                'Serial #': serialNumber,
                'Date Sold': dateSold,
                'Submission Source': 'Dashboard',
              },
            },
          ],
        }),
      }
    )

    const data = await response.json()

    return res.status(response.status).json(data)
  } catch (err) {
    return res.status(500).json({
      error: 'Server crash',
      message: err.message,
    })
  }
}
