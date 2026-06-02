'use client'

import { useState } from 'react'

const SIDEBAR_COLLAPSED_KEY = 'tubeclass-sidebar-collapsed'

function getStoredCollapsed() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

function setStoredCollapsed(value: boolean) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value))
  } catch {
    // Storage can be unavailable in restricted browser contexts; the UI state still updates.
  }
}

export function useSidebarCollapsed(enabled = true) {
  const [isCollapsed, setIsCollapsed] = useState(getStoredCollapsed)

  function toggleCollapsed() {
    if (!enabled) return

    setIsCollapsed((current) => {
      const next = !current
      setStoredCollapsed(next)
      return next
    })
  }

  return { isCollapsed: enabled ? isCollapsed : false, toggleCollapsed }
}
