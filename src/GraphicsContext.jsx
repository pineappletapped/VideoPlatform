import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

/** @component GraphicsContext wraps websocket-based state and actions */
export const GraphicsContext = createContext(null);

export function useGraphics() {
  return useContext(GraphicsContext);
}

export function GraphicsProvider({ eventId, children }) {
  const [graphics, setGraphics] = useState({});
  const [activeCategory, setActiveCategory] = useState('lower-thirds');
  const wsRef = useRef(null);

  useEffect(() => {
    // fetch initial graphics
    fetch(`/api/events/${eventId}/graphics`)
      .then(r => r.json())
      .then(setGraphics);
    // open websocket
    wsRef.current = new WebSocket(`/api/events/${eventId}/graphics/ws`);
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'update') setGraphics(msg.payload);
    };
    return () => wsRef.current && wsRef.current.close();
  }, [eventId]);

  const send = (cmd, payload) => {
    wsRef.current && wsRef.current.send(JSON.stringify({ cmd, ...payload }));
  };

  const take = (id) => send('TAKE', { id });
  const preview = (id) => send('PREVIEW', { id });
  const clear = () => send('CLEAR');

  const value = { graphics, activeCategory, setActiveCategory, take, preview, clear };
  return <GraphicsContext.Provider value={value}>{children}</GraphicsContext.Provider>;
}
