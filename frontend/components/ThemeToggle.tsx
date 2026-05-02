'use client';

import { useTheme } from '@/lib/theme';

export default function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: '0.5rem 0.875rem',
        background: isDark ? '#475569' : '#f1f5f9',
        color: isDark ? '#f1f5f9' : '#334155',
        border: `1px solid ${isDark ? '#64748b' : '#cbd5e1'}`,
        borderRadius: '0.75rem',
        cursor: 'pointer',
        fontSize: '0.8125rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        transition: 'all 0.2s',
        ...style,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      title={isDark ? '切換亮色模式' : '切換深色模式'}
    >
      {isDark ? '☀️ 亮色' : '🌙 深色'}
    </button>
  );
}