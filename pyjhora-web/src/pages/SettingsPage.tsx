import { Card } from '../components/shared/Card';

export function SettingsPage() {
  return (
    <div className="page-stub">
      <Card>
        <h2>Settings</h2>
        <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
          Settings coming soon. This will allow configuration of chart style,
          ayanamsa mode, language, and other calculation preferences.
        </p>
      </Card>
    </div>
  );
}
