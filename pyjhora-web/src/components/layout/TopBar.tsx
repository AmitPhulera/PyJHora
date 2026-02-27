import { useHoroscopeContext } from '../../contexts/HoroscopeContext';
import { ThemeToggle } from '../shared/ThemeToggle';
import { ChartStyleSelector } from '../charts/ChartStyleSelector';
import './TopBar.css';

export function TopBar() {
  const { birthData, horoscope } = useHoroscopeContext();

  return (
    <header className="topbar">
      <div className="topbar-logo">JHora</div>

      <div className="topbar-center">
        {horoscope && birthData && (
          <div className="topbar-birth-info">
            <span className="topbar-birth-place">{birthData.placeName}</span>
            <span className="topbar-birth-sep">&middot;</span>
            <span className="topbar-birth-date">{birthData.date}</span>
            <span className="topbar-birth-sep">&middot;</span>
            <span className="topbar-birth-time">{birthData.time}</span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <ChartStyleSelector />
        <ThemeToggle />
      </div>
    </header>
  );
}
