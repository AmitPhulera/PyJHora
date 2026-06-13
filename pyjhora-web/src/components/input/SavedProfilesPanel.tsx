/**
 * SavedProfilesPanel — lists saved birth charts beside the input form on the
 * home page. Clicking a profile loads its chart; the × deletes it.
 */
import { profileLabel, type Profile } from '../../hooks/useProfiles';
import './SavedProfilesPanel.css';

interface SavedProfilesPanelProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onDelete: (id: string) => void;
}

function formatSubtitle(profile: Profile): string {
  // When the label already includes place+date (no name), show only the time.
  if (profile.name?.trim()) {
    return `${profile.placeName} · ${profile.date} ${profile.time}`;
  }
  return profile.time;
}

export function SavedProfilesPanel({ profiles, onSelect, onDelete }: SavedProfilesPanelProps) {
  if (profiles.length === 0) {
    return (
      <aside className="saved-profiles card" aria-label="Saved profiles">
        <h3 className="saved-profiles-title">Saved Profiles</h3>
        <p className="saved-profiles-empty text-secondary text-sm">
          Charts you calculate are saved here automatically.
        </p>
      </aside>
    );
  }

  return (
    <aside className="saved-profiles card" aria-label="Saved profiles">
      <h3 className="saved-profiles-title">Saved Profiles</h3>
      <ul className="saved-profiles-list">
        {profiles.map((profile) => (
          <li key={profile.id} className="saved-profiles-item">
            <button
              type="button"
              className="saved-profiles-load"
              onClick={() => onSelect(profile)}
            >
              <span className="saved-profiles-name">{profileLabel(profile)}</span>
              <span className="saved-profiles-sub text-secondary">{formatSubtitle(profile)}</span>
            </button>
            <button
              type="button"
              className="saved-profiles-delete"
              aria-label={`Delete ${profileLabel(profile)}`}
              title="Delete profile"
              onClick={() => onDelete(profile.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default SavedProfilesPanel;
