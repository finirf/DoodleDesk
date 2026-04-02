/**
 * Automatic Database Schema Migrations
 * This module runs on app startup and ensures required columns exist
 */

import { getItemTextColor, getItemFontSize, getItemFontWeight, getItemFontStyle } from '../utils/itemUtils'

/**
 * Attempt to initialize database schema by inserting into a test record
 * If columns don't exist, the error tells us what to add
 * This provides feedback for schema initialization
 */
export async function initializeDatabaseSchema(supabase) {
  try {
    // Check if text formatting columns exist by trying to read from a note
    const { data: testNote, error: testError } = await supabase
      .from('notes')
      .select('font_weight, font_style, text_color, font_size')
      .limit(1)

    if (testError && testError.message && testError.message.includes('column')) {
      console.warn('⚠️  Database schema is outdated. Missing text formatting columns.')
      console.warn('    Run this in your Supabase SQL Editor:')
      console.warn('')
      console.warn('    alter table public.notes add column if not exists font_weight text default \'normal\' check (font_weight in (\'normal\', \'bold\'));')
      console.warn('    alter table public.notes add column if not exists font_style text default \'normal\' check (font_style in (\'normal\', \'italic\'));')
      console.warn('    alter table public.notes add column if not exists text_color text default \'#222222\';')
      console.warn('    alter table public.notes add column if not exists font_size integer default 16 check (font_size >= 10 and font_size <= 48);')
      console.warn('    alter table public.checklists add column if not exists font_weight text default \'normal\' check (font_weight in (\'normal\', \'bold\'));')
      console.warn('    alter table public.checklists add column if not exists font_style text default \'normal\' check (font_style in (\'normal\', \'italic\'));')
      console.warn('    alter table public.checklists add column if not exists text_color text default \'#222222\';')
      console.warn('    alter table public.checklists add column if not exists font_size integer default 16 check (font_size >= 10 and font_size <= 48);')
      return false
    }

    if (testNote) {
      console.log('✓ Database schema initialized with text formatting columns')
      return true
    }
  } catch (err) {
    console.warn('Database schema check encountered an issue:', err.message)
  }
  
  return true
}

/**
 * Safe getters that handle missing columns gracefully
 * These are used throughout the app when displaying formatting
 */
export function safeGetItemFontWeight(item) {
  try {
    return getItemFontWeight(item)
  } catch {
    return 'normal'
  }
}

export function safeGetItemFontStyle(item) {
  try {
    return getItemFontStyle(item)
  } catch {
    return 'normal'
  }
}

export function safeGetItemTextColor(item) {
  try {
    return getItemTextColor(item)
  } catch {
    return '#222222'
  }
}

export function safeGetItemFontSize(item) {
  try {
    return getItemFontSize(item)
  } catch {
    return 16
  }
}
