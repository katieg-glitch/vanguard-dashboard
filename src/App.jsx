from pathlib import Path
path=Path('App.js')
code=path.read_text()

# Replace normalizeBrand function
import re

new_normalize = "function normalizeBrand(raw) {\n  // Airtable can return arrays for multi-select fields\n  if (Array.isArray(raw)) raw = raw[0] || ''\n\n  const s = String(raw || '')\n    .trim()\n    .replace(/\\s+/g, ' ')\n    .toLowerCase()\n\n  if (!s) return ''\n\n  // Map variants like \"Scag Midwest\", \"Scag West & CA\", etc.\n  if (s.includes('ferris')) return 'ferris'\n  if (s.includes('scag')) return 'scag'\n  if (s.includes('wright')) return 'wright'\n\n  return s\n}\n"

code2=re.sub(r"function\s+normalizeBrand\([^\)]*\)\s*\{[\s\S]*?\n\}\n\nfunction\s+aggregateScoreboard",
            new_normalize+"\nfunction aggregateScoreboard", code, count=1)

# Replace aggregateScoreboard function body
new_agg = "function aggregateScoreboard(records) {\n  const map = {}\n\n  const isDotPlaceholder = (name) => {\n    const cleaned = String(name || '').trim().replace(/\\s+/g, '')\n    return cleaned === '.'\n  }\n\n  records.forEach((r) => {\n    const fields = r.fields || {}\n\n    // Prefer full name first (reduces collisions from initials)\n    const fullName = String(fields['Salesperson Name'] || '').trim()\n    const contestName = String(fields['Contest Salesperson Name'] || '').trim()\n    const displayName = fullName || contestName\n\n    // Ignore placeholder salesperson values like '.'\n    if (!displayName || isDotPlaceholder(displayName)) return\n\n    const dealer = String(fields['Dealer Name'] || '').trim()\n    const dealerNumber = String(fields['Dealer #'] || '').trim()\n    const email = String(fields['Email'] || '').trim()\n\n    const brand = normalizeBrand(fields['Contest Brand'] || fields['Brand'] || '')\n    if (!['ferris', 'scag', 'wright'].includes(brand)) return\n\n    // Stable grouping: email preferred, and include dealer to avoid cross-dealer merges\n    const personKey = (email || displayName).toLowerCase()\n    const dealerKey = (dealerNumber || dealer).toLowerCase()\n    const key = `${personKey}|${dealerKey}`\n\n    if (!map[key]) {\n      map[key] = {\n        salesperson: displayName,\n        dealer,\n        dealerNumber,\n        ferris: 0,\n        scag: 0,\n        wright: 0,\n        total: 0,\n      }\n    }\n\n    if (brand === 'ferris') map[key].ferris += 1\n    else if (brand === 'scag') map[key].scag += 1\n    else if (brand === 'wright') map[key].wright += 1\n\n    map[key].total = map[key].ferris + map[key].scag + map[key].wright\n  })\n\n  return Object.values(map).sort((a, b) => {\n    if (b.total !== a.total) return b.total - a.total\n    return a.salesperson.localeCompare(b.salesperson)\n  })\n}\n"

# substitute existing aggregateScoreboard
code3=re.sub(r"function\s+aggregateScoreboard\([^\)]*\)\s*\{[\s\S]*?\n\}\n\nfunction\s+parseCSV",
            new_agg+"\n\nfunction parseCSV", code2, count=1)

# sanity check updateEntry exists and uses [field]
if "[field]: val" not in code3:
    # attempt to fix if old broken form is present
    code3=code3.replace("e[i] = { ...e[i], val }","e[i] = { ...e[i], [field]: val }")

# Save updated file
Path('App_fixed.jsx').write_text(code3)
print('updated lines', len(code3.splitlines()))
# print first 120 lines for sanity
