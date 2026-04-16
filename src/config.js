export const ENABLE_FINAL_PROJECT = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_ENABLE_FINAL_PROJECT ?? '').trim().toLowerCase()
)