import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';

export const THEMES = [
  {
    id: 'dark',
    name: 'Dark',
    labelTR: 'Karanlık',
    preview: ['#111827', '#1f2937', '#d97706'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    labelTR: 'Gece Moru',
    preview: ['#0d0d1a', '#1a1a2e', '#7c3aed'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    labelTR: 'Okyanus',
    preview: ['#0a1628', '#0f2342', '#0ea5e9'],
  },
  {
    id: 'forest',
    name: 'Forest',
    labelTR: 'Orman',
    preview: ['#0a1a0a', '#0f2d0f', '#16a34a'],
  },
  {
    id: 'rose',
    name: 'Rose',
    labelTR: 'Kızıl',
    preview: ['#1a0a0e', '#2d0f18', '#e11d48'],
  },
  {
    id: 'dark-saas',
    name: 'Dark SaaS',
    labelTR: 'SaaS Pro',
    preview: ['#0f172a', '#1e293b', '#3b82f6'],
  },
];

const STORAGE_KEY = 'ro-tracker-theme';

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'dark';
}

export function applyTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem(STORAGE_KEY, themeId);
}

const ThemeSwitcher = () => {
  const [current, setCurrent] = useState(getStoredTheme());
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (themeId) => {
    setCurrent(themeId);
    applyTheme(themeId);
    setOpen(false);
  };

  const activeTheme = THEMES.find(t => t.id === current) || THEMES[0];

  return (
    <div ref={ref} className="relative" style={{ zIndex: 9999 }}>
      <button
        onClick={() => setOpen(prev => !prev)}
        title="Tema Değiştir"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.07)',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
      >
        {/* Color preview dots */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {activeTheme.preview.map((c, i) => (
            <div key={i} style={{
              width: i === 2 ? '10px' : '6px',
              height: i === 2 ? '10px' : '6px',
              borderRadius: '50%',
              background: c,
              border: i === 2 ? '1.5px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
              boxShadow: i === 2 ? `0 0 6px ${c}` : 'none',
            }} />
          ))}
        </div>
        <Palette size={14} />
        <span className="hidden md:inline">{activeTheme.labelTR}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: '190px',
          background: 'var(--bg-800, #1f2937)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
          color: 'var(--text-main, inherit)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          padding: '8px',
          backdropFilter: 'blur(12px)',
        }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted, rgba(255,255,255,0.4))',
            padding: '4px 8px 8px',
          }}>Tema Seç</p>
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: current === theme.id
                  ? 'var(--dropdown-active, rgba(255,255,255,0.1))'
                  : 'transparent',
                outline: current === theme.id
                  ? '1px solid var(--dropdown-outline, rgba(255,255,255,0.2))'
                  : 'none',
                color: 'inherit',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                if (current !== theme.id) e.currentTarget.style.background = 'var(--dropdown-hover, rgba(255,255,255,0.06))';
              }}
              onMouseLeave={e => {
                if (current !== theme.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Preview dots */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                {theme.preview.map((c, i) => (
                  <div key={i} style={{
                    width: i === 2 ? '14px' : '8px',
                    height: i === 2 ? '14px' : '8px',
                    borderRadius: '50%',
                    background: c,
                    border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
                    boxShadow: i === 2 ? `0 0 8px ${c}88` : 'none',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{theme.labelTR}</span>
              {current === theme.id && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  color: theme.preview[2],
                  fontWeight: 700,
                }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
