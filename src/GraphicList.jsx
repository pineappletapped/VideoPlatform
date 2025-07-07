import React from 'react';
import { useGraphics } from './GraphicsContext';

/** @component List of graphics with basic selection */
export default function GraphicList() {
  const { graphics, activeCategory, preview } = useGraphics();
  const items = graphics[activeCategory] || [];
  return (
    <section id="graphic-list" className="listview">
      {items.map(g => (
        <div key={g.id} className="listview__item" onDoubleClick={() => preview(g.id)}>
          {g.name}
        </div>
      ))}
    </section>
  );
}
