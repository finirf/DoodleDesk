import { supabase } from '../../../supabase'

/**
 * Trigger export of user's activity data from Supabase to Azure raw-events blob.
 * Called when:
 * - User logs in/out
 * - Analytics dashboard opened with activity changes
 * - User clicks "Export to Azure" button in analytics dashboard
 * - User generates sample data
 *
 * @param {string} userId - The user ID to export activities for
 * @returns {Promise<{success: boolean, eventCount: number, filename?: string, error?: string}>}
 */
export async function exportActivitiesToAzure(userId) {
  try {
    const { data, error } = await supabase.functions.invoke('export-activities-to-azure', {
      body: { userId },
    })

    if (error) {
      console.error('Export activities error:', error)
      return {
        success: false,
        eventCount: 0,
        error: error.message || 'Failed to export activities',
      }
    }

    return data || { success: false, eventCount: 0, error: 'No response from function' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Export activities exception:', message)
    return {
      success: false,
      eventCount: 0,
      error: message,
    }
  }
}
