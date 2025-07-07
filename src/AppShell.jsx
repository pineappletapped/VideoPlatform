import React from 'react';
import TransportBar from './TransportBar';
import Sidebar from './Sidebar';
import GraphicList from './GraphicList';
import PreviewPane from './PreviewPane';
import ProgramPane from './ProgramPane';
import EditDrawer from './EditDrawer';
import ToastStack from './ToastStack';

/** @component Overall layout shell */
export default function AppShell() {
  return (
    <div id="app">
      <TransportBar />
      <Sidebar />
      <main className="workspace">
        <GraphicList />
        <PreviewPane />
        <ProgramPane />
      </main>
      <EditDrawer />
      <ToastStack />
    </div>
  );
}
