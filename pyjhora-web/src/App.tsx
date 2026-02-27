/**
 * JHora PWA - Application Shell
 * Layout with TopBar, Sidebar, BottomNav and routed pages.
 */

import { Routes, Route } from 'react-router-dom';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { OverviewPage } from './pages/OverviewPage';
import { ChartsPage } from './pages/ChartsPage';
import { DashasPage } from './pages/DashasPage';
import { YogasPage } from './pages/YogasPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/dashas" element={<DashasPage />} />
            <Route path="/yogas" element={<YogasPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default App;
