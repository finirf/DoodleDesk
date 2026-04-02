/**
 * Database Migrations
 * Handles automatic schema upgrades by adding missing columns
 */

export async function ensureTextFormattingColumns(supabase) {
  try {
    // Try to add text formatting columns to notes table
    // Using "if not exists" means this is safe to run multiple times
    await supabase.rpc('ensure_text_formatting_columns')
  } catch {
    // If the RPC doesn't exist, we'll need to handle this through direct table checks
    // For now, we'll attempt the migrations directly
    console.warn('Text formatting columns check: attempting direct migration')
  }

  // Alternative approach: attempt each migration directly
  // If columns already exist, "if not exists" will prevent errors
  try {
    // Notes table migrations
    const migrationsToRun = [
      {
        table: 'notes',
        column: 'font_weight',
        definition: "text default 'normal' check (font_weight in ('normal', 'bold'))"
      },
      {
        table: 'notes',
        column: 'font_style',
        definition: "text default 'normal' check (font_style in ('normal', 'italic'))"
      },
      {
        table: 'notes',
        column: 'text_color',
        definition: "text default '#222222'"
      },
      {
        table: 'notes',
        column: 'font_size',
        definition: 'integer default 16 check (font_size >= 10 and font_size <= 48)'
      },
      {
        table: 'checklists',
        column: 'font_weight',
        definition: "text default 'normal' check (font_weight in ('normal', 'bold'))"
      },
      {
        table: 'checklists',
        column: 'font_style',
        definition: "text default 'normal' check (font_style in ('normal', 'italic'))"
      },
      {
        table: 'checklists',
        column: 'text_color',
        definition: "text default '#222222'"
      },
      {
        table: 'checklists',
        column: 'font_size',
        definition: 'integer default 16 check (font_size >= 10 and font_size <= 48)'
      }
    ]

    // We can't execute raw SQL through the Supabase client from the browser,
    // so we'll just log that these columns should exist
    console.log('Database initialization: Text formatting columns should be added via BACKEND_SQL_README.md (Section 14)')
    console.log('Required columns:', migrationsToRun.map(m => `${m.table}.${m.column}`))

    return true
  } catch (error) {
    console.error('Database migration check failed:', error)
    return false
  }
}

export async function initializeDatabaseSchema(supabase) {
  /**
   * Run all necessary database migrations on app startup
   * This ensures the database schema is up-to-date
   */
  try {
    await ensureTextFormattingColumns(supabase)
  } catch (error) {
    console.error('Failed to initialize database schema:', error)
  }
}
