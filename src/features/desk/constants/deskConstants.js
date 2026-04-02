export const FONT_OPTIONS = [
  { label: 'System', value: 'inherit' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' }
]

export const NOTE_OPTIONS = [
  {
    key: 'classic-sticky-note',
    label: 'Classic Sticky Note',
    color: '#fff59d',
    image: null
  },
  {
    key: 'header-note',
    label: 'Header Note',
    color: '#9bd9e8',
    image: null
  }
]

export const DECORATION_OPTIONS = [
  { key: 'mug', label: 'Mug', emoji: '☕' },
  { key: 'pen', label: 'Pen', emoji: '🖊️' },
  { key: 'pencil', label: 'Pencil', emoji: '✏️' },
  { key: 'plant', label: 'Plant', emoji: '🪴' },
  { key: 'blue-sticky-note', label: 'Blue Sticker', image: '/images/Notes/blue%20sticky%20note.png' },
  { key: 'green-sticky-note', label: 'Green Sticker', image: '/images/Notes/green%20sticky%20note.png' },
  { key: 'pink-sticky-note', label: 'Pink Sticker', image: '/images/Notes/pink%20sticky%20note.png' },
  { key: 'yellow-sticky-note', label: 'Yellow Sticker', image: '/images/Notes/yellow%20sticky%20note.png' },
  { key: 'flashcard-sticky-note', label: 'Flashcard Sticker', image: '/images/Notes/flashcard%20sticky%20note.png' },
  { key: 'polka-dot-envelope', label: 'Polka Dot Envelope', image: '/images/Notes/polka%20dot%20envelope.png' },
  { key: 'swirly-envelope', label: 'Swirly Envelope', image: '/images/Notes/swirly%20envelope.png' },
  { key: 'binder-clip', label: 'Binder Clip', emoji: '📎', image: '/images/Decorations/binder%20clip.png' },
  { key: 'blue-tack', label: 'Blue Tack', emoji: '📍', image: '/images/Decorations/blue%20tack.png' },
  { key: 'green-tab', label: 'Green Tab', emoji: '🏷️', image: '/images/Decorations/green%20tab.png' },
  { key: 'orange-tab', label: 'Orange Tab', emoji: '🏷️', image: '/images/Decorations/orange%20tab.png' },
  { key: 'paperclips', label: 'Paperclips', emoji: '📎', image: '/images/Decorations/paperclips.png' },
  { key: 'pink-tab', label: 'Pink Tab', emoji: '🏷️', image: '/images/Decorations/pink%20tab.png' },
  { key: 'pink-tack', label: 'Pink Tack', emoji: '📍', image: '/images/Decorations/pink%20tack.png' },
  { key: 'logo', label: 'Logo', emoji: '🪧', image: '/images/Decorations/DoodleDesk%20Logo.png' }
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

