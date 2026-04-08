import React, { useState, useEffect, useRef } from 'react'

const CATEGORIES = [
  {
    icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😋','😛','😝','😜','🤑','🤗','🤔','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤧','🥵','🥶','😵','🤯','🥳','😎','🤓','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿']
  },
  {
    icon: '👋',
    emojis: ['👋','🤚','🖐','✋','🖖','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','👁','👀','👄','👅']
  },
  {
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','✨','⭐','🌟','💫','🌈','🔥','💥','💢','💨','💦','💤']
  },
  {
    icon: '🎉',
    emojis: ['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🏅','🎖','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎲','🎯','🎮','🕹','🎰','🧩','🎪']
  },
  {
    icon: '🐶',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🐢','🦎','🐍','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🦈']
  },
  {
    icon: '🍎',
    emojis: ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🍆','🌽','🍄','🍞','🥐','🧀','🥚','🍳','🥞','🧇','🌭','🍔','🍟','🍕','🌮','🌯','🍱','🍣','🍜','🍝','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🥤','🍺','🍻','🥂','🍷']
  },
]

export default function EmojiPickerPanel({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0)
  const [search, setSearch] = useState('')
  const panelRef = useRef()

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    // Delay to avoid closing immediately on the toggle button click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const allEmojis = CATEGORIES.flatMap(c => c.emojis)
  const filteredEmojis = search.trim()
    ? allEmojis.filter(e => e.includes(search))
    : CATEGORIES[activeCategory].emojis

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        bottom: '64px',
        left: '8px',
        width: '300px',
        maxHeight: '320px',
        backgroundColor: 'var(--modal-bg)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        animation: 'fadeInScale 0.18s ease forwards',
      }}
    >
      {/* Search bar */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <input
          placeholder="Search emoji…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%', padding: '5px 10px', borderRadius: '20px',
            border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)', fontSize: '0.83rem', outline: 'none',
          }}
        />
      </div>

      {/* Category tabs */}
      {!search.trim() && (
        <div style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid var(--border-color)', gap: '2px', flexShrink: 0 }}>
          {CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              title={cat.icon}
              style={{
                background: activeCategory === i ? 'var(--selected-bg)' : 'none',
                border: 'none', borderRadius: '6px', padding: '3px 6px',
                cursor: 'pointer', fontSize: '1rem', flexShrink: 0,
              }}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '6px',
        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '1px',
      }}>
        {filteredEmojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onSelect(emoji)}
            style={{
              background: 'none', border: 'none', padding: '4px',
              cursor: 'pointer', fontSize: '1.25rem', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            {emoji}
          </button>
        ))}
        {filteredEmojis.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '16px' }}>
            No results
          </div>
        )}
      </div>
    </div>
  )
}
