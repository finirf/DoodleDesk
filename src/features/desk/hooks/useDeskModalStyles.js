/**
 * useDeskModalStyles
 *
 * Extracts and organizes modal-related style objects (overlay, card, buttons, etc.)
 * from the global modalStyles constant for convenient destructuring and reuse.
 * Centralizes modal styling organization.
 */
export default function useDeskModalStyles(modalStyles) {
  const {
    overlay: modalOverlayStyle,
    card: modalCardStyle,
    title: modalTitleStyle,
    actions: modalActionsStyle,
    secondaryButton: modalSecondaryButtonStyle,
    primaryButton: modalPrimaryButtonStyle,
    dangerButton: modalDangerButtonStyle
  } = modalStyles

  return {
    modalOverlayStyle,
    modalCardStyle,
    modalTitleStyle,
    modalActionsStyle,
    modalSecondaryButtonStyle,
    modalPrimaryButtonStyle,
    modalDangerButtonStyle
  }
}
