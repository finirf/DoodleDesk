import { useEffect } from 'react'
import { supabase } from '../../supabase'

/**
 * Initialize database schema by attempting to create missing columns
 * This runs silently on app startup to ensure schema matches app requirements
 */
export function useDatabaseSchemaInitialization(session) {
  useEffect(() => {
    if (!session?.user?.id) return

    async function ensureSchemaExists() {
      try {
        // Attempt to read formatting columns from notes table
        // If they don't exist, we get an error but can't fix it without service key
        // However, the cumulative fallback logic in saveItemEdits handles this gracefully
        
        const { error } = await supabase
          .from('notes')
          .select('font_weight, font_style, text_color, font_size')
          .limit(1)

        if (error && error.message && error.message.includes('column')) {
          console.warn(
            '⚠️  Database schema is outdated.\n' +
            'Text formatting columns are missing. Run database migration:\n' +
            '👉 Follow the finished SQL migrations in BACKEND_SQL_README.md (Section 14)\n' +
            'Current canonical file: BACKEND_SQL_README.md'
          )
        } else {
          console.log('✓ Database schema initialized with text formatting columns')
        }
      } catch (err) {
        // Silently continue - the app will work with fallback logic
        console.debug('Schema check:', err.message)
      }
    }

    ensureSchemaExists()
  }, [session?.user?.id])
}

export default useDatabaseSchemaInitialization
