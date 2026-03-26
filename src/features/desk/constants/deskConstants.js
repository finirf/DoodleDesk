export const FONT_OPTIONS = [
  { label: 'System', value: 'inherit' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' }
]

export const DECORATION_OPTIONS = [
  { key: 'mug', label: 'Mug', emoji: '☕' },
  { key: 'pen', label: 'Pen', emoji: '🖊️' },
  { key: 'pencil', label: 'Pencil', emoji: '✏️' },
  { key: 'plant', label: 'Plant', emoji: '🪴' }
]

export const BUILT_IN_SHELVES = [
  { id: '__private', label: 'Private' },
  { id: '__shared', label: 'Shared' },
  { id: '__sharing', label: 'Sharing' }
]

/**
 * Interaction behavior constants for mouse/touch interactions
 */
export const INTERACTION_CONSTANTS = {
  // Resize constraints
  MIN_SCALE: 0.1,
  
  // Stack offset when notes are dropped on top of each other (pixels)
  STACK_OFFSET_X: 8,
  STACK_OFFSET_Y: 8,
  
  // Long-press gesture timing (milliseconds)
  LONG_PRESS_DELAY: 350,
  LONG_PRESS_MOVE_THRESHOLD: 10,
  
  // Group visibility thresholds
  MIN_GROUPED_ITEMS_FOR_OUTLINE: 2,
  
  // Drag-scroll prevention (mobile)
  DRAG_SCROLL_LOCK_THRESHOLD: 5
}

