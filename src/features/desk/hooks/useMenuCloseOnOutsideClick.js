import { useEffect, useRef } from 'react'

export default function useMenuCloseOnOutsideClick({
  showNewNoteMenu,
  showDeskMenu,
  showProfileMenu,
  setShowNewNoteMenu,
  setShowDeskMenu,
  setShowProfileMenu
}) {
  const newNoteMenuRef = useRef(null)
  const deskMenuRef = useRef(null)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    if (!showNewNoteMenu && !showDeskMenu && !showProfileMenu) return

    function handleClickOutside(e) {
      if (showNewNoteMenu && !newNoteMenuRef.current?.contains(e.target)) {
        setShowNewNoteMenu(false)
      }
      if (showDeskMenu && !deskMenuRef.current?.contains(e.target)) {
        setShowDeskMenu(false)
      }
      if (showProfileMenu && !profileMenuRef.current?.contains(e.target)) {
        setShowProfileMenu(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [showNewNoteMenu, showDeskMenu, showProfileMenu, setShowNewNoteMenu, setShowDeskMenu, setShowProfileMenu])

  return {
    newNoteMenuRef,
    deskMenuRef,
    profileMenuRef
  }
}