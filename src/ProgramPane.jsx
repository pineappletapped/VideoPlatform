import React from 'react';

/** @component Shows program canvas */
export default function ProgramPane() {
  return (
    <section id="program-pane" className="pane">
      <h2>PROGRAM</h2>
      <canvas id="program-canvas" />
    </section>
  );
}
