export default async function handler(req) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID
    const TABLE_NAME = 'Vanguard Sweepstakes'

    return new Response(
      JSON.stringify({
        hasApiKey: !!AIRTABLE_API_KEY,
        hasBaseId: !!BASE_ID,
        tableName: TABLE_NAME,
        baseIdPreview: BASE_ID ? BASE_ID.slice(0, 6) : null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Server crash',
        message: err.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
