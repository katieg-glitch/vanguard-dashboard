import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Trophy,
  Plus,
  Trash2,
  Star,
  Upload,
  RefreshCw,
  Award,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Medal,
} from 'lucide-react'

import logo from '../Vanguard-logo.png'
import paceLogo from '../Pace Logo White 2023.png'
import championshipRing from '../Ring.png'
import championshipBelt from '../Belt.png'

const BRANDS = ['Ferris', 'Scag', 'Wright']

function normalizeBrand(raw) {
  // Airtable can return arrays for multi-select fields
  if (Array.isArray(raw)) raw = raw[0] || ''

  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

  if (!s) return ''

  // Map variants like "Scag Midwest", "Scag West & CA", etc.
  if (s.includes('ferris')) return 'ferris'
  if (s.includes('scag')) return 'scag'
  if (s.includes('wright')) return 'wright'

  return s
}

function aggregateScoreboard(records) {
  const map = {}

  const isDotPlaceholder = (name) => {
    // trims and removes whitespace so " . " becomes "."
    const cleaned = String(name || '').trim().replace(/\s+/g, '')
    return cleaned === '.'
  }

  records.forEach((r) => {
    const fields = r.fields || {}

    // Prefer full name first (reduces collisions vs initials)
    const fullName = String(fields['Salesperson Name'] || '').trim()
    const contestName = String(fields['Contest Salesperson Name'] || '').trim()
