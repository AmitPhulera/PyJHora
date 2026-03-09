/**
 * Options Dialog Component
 * General-purpose options/settings dialog with radio, checkbox, and combobox modes
 * Ported from PyJHora options_dialog.py (OptionDialog, InfoDialog, WidgetDialog)
 */

import { useState, useCallback } from 'react';
import './dialog-base.css';
import './OptionsDialog.css';

// ============================================================================
// TYPES
// ============================================================================

/** Selection mode for the dialog */
export type OptionsSelectionMode =
  | 'single'       // Radio buttons (one selection)
  | 'multi'        // Checkboxes (multiple selections)
  | 'combo'        // Dropdown combobox(es)
  | 'info';        // Information display only

export interface OptionsDialogResult {
  selectedIndices: number[];
  selectedLabels: string[];
  accepted: boolean;
}

export interface OptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onAccept?: (result: OptionsDialogResult) => void;
  title?: string;
  label?: string;
  options?: string[] | string[][];
  selectionMode?: OptionsSelectionMode;
  defaultSelected?: number[];
  /** For info mode: text content to display */
  infoText?: string;
  /** Layout direction for combo groups */
  orientation?: 'horizontal' | 'vertical';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OptionsDialog({
  open,
  onClose,
  onAccept,
  title = 'Options',
  label = 'Select an option:',
  options = [],
  selectionMode = 'single',
  defaultSelected = [0],
  infoText = '',
  orientation = 'horizontal',
}: OptionsDialogProps) {
  // Track selected indices (for single mode, only one value; for multi, many)
  const [selected, setSelected] = useState<number[]>(defaultSelected);
  // Track combo selections when options is string[][] (nested lists)
  const [comboSelections, setComboSelections] = useState<number[]>(() => {
    if (selectionMode === 'combo' && Array.isArray(options[0])) {
      return (options as string[][]).map(() => 0);
    }
    return [0];
  });

  const isNested = Array.isArray(options[0]);

  // ---- Handlers ----
  const handleRadioChange = useCallback((index: number) => {
    setSelected([index]);
  }, []);

  const handleCheckboxChange = useCallback((index: number) => {
    setSelected(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }, []);

  const handleComboChange = useCallback((groupIndex: number, value: number) => {
    setComboSelections(prev => {
      const next = [...prev];
      next[groupIndex] = value;
      return next;
    });
  }, []);

  const handleAccept = useCallback(() => {
    let selectedIndices: number[];
    let selectedLabels: string[];

    if (selectionMode === 'combo') {
      if (isNested) {
        selectedIndices = comboSelections;
        selectedLabels = comboSelections.map(
          (sel, gi) => ((options as string[][])[gi]?.[sel]) ?? ''
        );
      } else {
        selectedIndices = comboSelections;
        selectedLabels = comboSelections.map(
          sel => ((options as string[])[sel]) ?? ''
        );
      }
    } else if (selectionMode === 'multi') {
      selectedIndices = [...selected].sort((a, b) => a - b);
      selectedLabels = selectedIndices.map(i => (options as string[])[i] ?? '');
    } else if (selectionMode === 'single') {
      selectedIndices = selected;
      selectedLabels = selected.map(i => (options as string[])[i] ?? '');
    } else {
      // info mode
      selectedIndices = [];
      selectedLabels = [];
    }

    onAccept?.({
      selectedIndices,
      selectedLabels,
      accepted: true,
    });
    onClose();
  }, [selectionMode, selected, comboSelections, options, isNested, onAccept, onClose]);

  const handleCancel = useCallback(() => {
    onAccept?.({
      selectedIndices: [],
      selectedLabels: [],
      accepted: false,
    });
    onClose();
  }, [onAccept, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog options-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
          <button className="dialog-close-btn" onClick={handleCancel} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="dialog-body">
          {/* Info Mode */}
          {selectionMode === 'info' && (
            <div className="options-info-text" dangerouslySetInnerHTML={{ __html: infoText }} />
          )}

          {/* Label */}
          {selectionMode !== 'info' && (
            <p className="options-label">{label}</p>
          )}

          {/* Single Selection (Radio) */}
          {selectionMode === 'single' && (
            <div className="options-list">
              {(options as string[]).map((opt, i) => (
                <label key={i} className="options-radio-item">
                  <input
                    type="radio"
                    name="option-radio"
                    checked={selected.includes(i)}
                    onChange={() => handleRadioChange(i)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Multi Selection (Checkbox) */}
          {selectionMode === 'multi' && (
            <div className="options-list">
              {(options as string[]).map((opt, i) => (
                <label key={i} className="options-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(i)}
                    onChange={() => handleCheckboxChange(i)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Combo Selection */}
          {selectionMode === 'combo' && (
            <div className={`options-combo-group ${orientation}`}>
              {isNested ? (
                (options as string[][]).map((group, gi) => (
                  <div key={gi} className="form-group">
                    <select
                      className="select"
                      value={comboSelections[gi] ?? 0}
                      onChange={e => handleComboChange(gi, Number(e.target.value))}
                    >
                      {group.map((item, ii) => (
                        <option key={ii} value={ii}>{item}</option>
                      ))}
                    </select>
                  </div>
                ))
              ) : (
                <div className="form-group">
                  <select
                    className="select"
                    value={comboSelections[0] ?? 0}
                    onChange={e => handleComboChange(0, Number(e.target.value))}
                  >
                    {(options as string[]).map((item, ii) => (
                      <option key={ii} value={ii}>{item}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn btn-primary" onClick={handleAccept}>
            Accept
          </button>
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default OptionsDialog;
