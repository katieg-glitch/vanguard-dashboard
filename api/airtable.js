export default async function handler(req, res) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID

    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    )

    const data = await response.json()

    return res.status(200).json({
      metaStatus: response.status,
      metaOk: response.ok,
      metaData: data,
    })
  } catch (err) {
    return res.status(500).json({
      error: 'Server crash',
      message: err.message,
    })
  }
}
