export default async function handler(req, res) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY

    return res.status(200).json({
      hasApiKey: !!AIRTABLE_API_KEY,
      tokenPreview: AIRTABLE_API_KEY ? AIRTABLE_API_KEY.slice(0, 6) : null,
      tokenLength: AIRTABLE_API_KEY ? AIRTABLE_API_KEY.length : 0,
    })
  } catch (err) {
    return res.status(500).json({
      error: 'Server crash',
      message: err.message,
    })
  }
}
