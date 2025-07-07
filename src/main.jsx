import React from 'react';
import { createRoot } from 'react-dom/client';
import AppShell from './AppShell';
import { GraphicsProvider } from './GraphicsContext';
import './css/graphics.css';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

const root = createRoot(document.getElementById('root'));
root.render(
  <GraphicsProvider eventId={eventId}>
    <AppShell />
  </GraphicsProvider>
);
