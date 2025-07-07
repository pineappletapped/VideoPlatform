import React from 'react';
import { useGraphics } from './GraphicsContext';

/** @component Sidebar for category selection */
export default function Sidebar() {
  const { activeCategory, setActiveCategory } = useGraphics();
  const cats = ['holdslate', 'lower-thirds', 'schedule', 'scorebug'];
  return (
    <aside className="sidebar">
      {cats.map(c => (
        <button
          key={c}
          data-cat={c}
          className={`sidebar__item ${activeCategory === c ? 'active' : ''}`}
          onClick={() => setActiveCategory(c)}
        >
          {c.replace('-', ' ')}
        </button>
      ))}
      <details>
        <summary className="sidebar__item">More ▾</summary>
      </details>
    </aside>
  );
}
