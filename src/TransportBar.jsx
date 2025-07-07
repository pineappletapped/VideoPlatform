import React from 'react';
import { useGraphics } from './GraphicsContext';
import toast from 'react-hot-toast';

/** @component Top bar with transport controls */
export default function TransportBar() {
  const { take, preview, clear } = useGraphics();
  return (
    <header className="transport-bar">
      <span id="conn-led" className="led led--ok" />
      <button className="btn btn--solid" onClick={() => { take(); toast('Take'); }}>TAKE</button>
      <button className="btn btn--ghost" onClick={() => preview()}>PREVIEW</button>
      <button className="btn btn--flat" onClick={() => clear()}>CUT</button>
      <span id="transport-spacer" />
    </header>
  );
}
