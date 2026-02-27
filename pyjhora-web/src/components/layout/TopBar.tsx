import { BirthInfoSummary } from '../input/BirthInfoSummary';
import { ThemeToggle } from '../shared/ThemeToggle';
import { ChartStyleSelector } from '../charts/ChartStyleSelector';
import './TopBar.css';

export function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-logo">JHora</div>

      <div className="topbar-center">
        <BirthInfoSummary />
      </div>

      <div className="topbar-right">
        <ChartStyleSelector />
        <ThemeToggle />
      </div>
    </header>
  );
}
