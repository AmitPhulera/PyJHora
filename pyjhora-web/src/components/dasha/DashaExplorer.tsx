/**
 * DashaExplorer — Full-page dasha browser with sidebar selector and table display
 */
import { DASHA_SYSTEMS, useHoroscopeContext, type DashaSystemId } from '../../contexts/HoroscopeContext';
import { Badge } from '../shared/Badge';
import { DashaSystemSelector } from './DashaSystemSelector';
import { DashaTable } from './DashaTable';
import './DashaExplorer.css';

export function DashaExplorer() {
  const {
    selectedSystem,
    setSelectedSystem,
    dashaResult,
    selectedDasha,
    setSelectedDasha,
  } = useHoroscopeContext();

  const systemInfo = DASHA_SYSTEMS.find((s) => s.id === selectedSystem);

  const typeBadgeVariant = (type: string): 'gold' | 'blue' | 'muted' => {
    if (type === 'graha') return 'gold';
    if (type === 'rasi') return 'blue';
    return 'muted';
  };

  return (
    <div className="dasha-explorer">
      <aside className="dasha-explorer-sidebar">
        <DashaSystemSelector
          selectedSystem={selectedSystem}
          onSelect={(id) => setSelectedSystem(id as DashaSystemId)}
        />
      </aside>

      <main className="dasha-explorer-main">
        {/* System info card */}
        {systemInfo && (
          <div className="dasha-info-card card">
            <div className="dasha-info-header">
              <h2 className="dasha-info-name">{systemInfo.name}</h2>
              <Badge variant={typeBadgeVariant(systemInfo.type)}>
                {systemInfo.type === 'graha' ? 'Graha' : systemInfo.type === 'rasi' ? 'Rasi' : 'Special'}
              </Badge>
            </div>
            <p className="dasha-info-desc text-secondary">{systemInfo.description}</p>
          </div>
        )}

        {/* Dasha results */}
        {dashaResult && dashaResult.mahadashas.length > 0 ? (
          <DashaTable
            title={systemInfo?.name ?? 'Dasha'}
            mahadashas={dashaResult.mahadashas.map((m) => ({
              lord: typeof m.lord === 'number' ? m.lord : 0,
              lordName: m.lordName,
              startDate: m.startDate,
              durationYears: m.durationYears,
            }))}
            bhuktis={dashaResult.bhuktis?.map((b) => ({
              dashaLord: typeof b.dashaLord === 'number' ? b.dashaLord : 0,
              bhuktiLord: typeof b.bhuktiLord === 'number' ? b.bhuktiLord : 0,
              bhuktiLordName: b.bhuktiLordName,
              startDate: b.startDate,
            }))}
            balance={dashaResult.balance}
            selectedDasha={selectedDasha}
            onDashaSelect={setSelectedDasha}
            coloringMode={systemInfo?.type === 'rasi' || systemInfo?.type === 'special' ? 'rasi' : 'planet'}
          />
        ) : (
          <div className="dasha-empty card">
            <p className="text-secondary">
              {dashaResult
                ? 'No periods returned for this dasha system.'
                : 'Calculating dasha periods...'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
