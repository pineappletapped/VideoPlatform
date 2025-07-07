import React from 'react';

/** @component Shows preview canvas */
export default function PreviewPane() {
  return (
    <section id="preview-pane" className="pane">
      <h2>PREVIEW</h2>
      <canvas id="preview-canvas" />
    </section>
  );
}
