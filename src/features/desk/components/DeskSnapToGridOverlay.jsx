/**
 * DeskSnapToGridOverlay
 *
 * Renders a visual grid overlay on the desk canvas when snap-to-grid is enabled.
 * The overlay uses CSS gradients to create a repeating grid pattern without
 * DOM overhead from individual grid cells.
 */
export default function DeskSnapToGridOverlay({ gridSize = 20 }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(to right, rgba(0,0,0,0.08), rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${gridSize}px), repeating-linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${gridSize}px)`,
        zIndex: 0
      }}
    />
  )
}
