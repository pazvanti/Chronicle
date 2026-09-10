import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import { WysiwygEditor } from './WysiwygEditor';
import { CodeEditor } from './CodeEditor';
import { CharacterSheetPanel } from '../Characters/CharacterSheetPanel';
import { CharacterDetailModal } from '../Characters/CharacterDetailModal';
import { LocationCodexPanel } from '../Locations/LocationCodexPanel';
import { LocationDetailModal } from '../Locations/LocationDetailModal';
import { Eye, Code, Users, Clock, Compass } from 'lucide-react';

export const EditorContainer: React.FC = () => {
  const { editorSubMode, setEditorSubMode, characters, locations, timelines, setViewMode } = useEpub();
  const [isCharacterPanelOpen, setIsCharacterPanelOpen] = useState<boolean>(false);
  const [modalCharacterId, setModalCharacterId] = useState<string | null>(null);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState<boolean>(false);
  const [modalLocationId, setModalLocationId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      {/* Top Toggle for Visual vs Code + Writer Tools */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 1rem',
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div className="view-tabs" style={{ background: 'var(--bg-app)' }}>
            <button
              className={`view-tab-btn ${editorSubMode === 'visual' ? 'active' : ''}`}
              onClick={() => setEditorSubMode('visual')}
            >
              <Eye size={14} />
              <span>Visual WYSIWYG</span>
            </button>
            <button
              className={`view-tab-btn ${editorSubMode === 'code' ? 'active' : ''}`}
              onClick={() => setEditorSubMode('code')}
            >
              <Code size={14} />
              <span>HTML Source</span>
            </button>
          </div>
        </div>

        {/* Right side: Timeline, Character Sheets & Locations Codex */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-sm btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
            }}
            onClick={() => setViewMode('timeline')}
            title="Open Story Timelines"
          >
            <Clock size={14} />
            <span>Timeline</span>
            {timelines.length > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 600,
                  marginLeft: '2px',
                }}
              >
                {timelines.length}
              </span>
            )}
          </button>

          <button
            className={`btn btn-sm ${isCharacterPanelOpen ? 'btn-primary' : 'btn-outline'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              setIsCharacterPanelOpen(prev => !prev);
              if (!isCharacterPanelOpen) setIsLocationPanelOpen(false);
            }}
            title={isCharacterPanelOpen ? 'Close Character Sheets drawer' : 'Open Character Sheets drawer'}
          >
            <Users size={14} />
            <span>Characters</span>
            {characters.length > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isCharacterPanelOpen
                    ? 'rgba(255,255,255,0.25)'
                    : 'var(--bg-surface-elevated)',
                  border: isCharacterPanelOpen
                    ? 'none'
                    : '1px solid var(--border-subtle)',
                  fontWeight: 600,
                  marginLeft: '2px',
                }}
              >
                {characters.length}
              </span>
            )}
          </button>

          <button
            className={`btn btn-sm ${isLocationPanelOpen ? 'btn-primary' : 'btn-outline'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              setIsLocationPanelOpen(prev => !prev);
              if (!isLocationPanelOpen) setIsCharacterPanelOpen(false);
            }}
            title={isLocationPanelOpen ? 'Close Locations Codex drawer' : 'Open Locations Codex drawer'}
          >
            <Compass size={14} />
            <span>Locations Codex</span>
            {locations.length > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isLocationPanelOpen
                    ? 'rgba(255,255,255,0.25)'
                    : 'var(--bg-surface-elevated)',
                  border: isLocationPanelOpen
                    ? 'none'
                    : '1px solid var(--border-subtle)',
                  fontWeight: 600,
                  marginLeft: '2px',
                }}
              >
                {locations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Editor Main Content + Side Drawers */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {editorSubMode === 'visual' ? <WysiwygEditor /> : <CodeEditor />}
        </div>
        {isCharacterPanelOpen && (
          <CharacterSheetPanel
            onExpandModal={id => setModalCharacterId(id)}
            onClose={() => setIsCharacterPanelOpen(false)}
          />
        )}
        {isLocationPanelOpen && (
          <LocationCodexPanel
            onExpandModal={id => setModalLocationId(id)}
            onClose={() => setIsLocationPanelOpen(false)}
          />
        )}
      </div>

      {/* Deep-Dive Modals */}
      <CharacterDetailModal
        characterId={modalCharacterId}
        isOpen={!!modalCharacterId}
        onClose={() => setModalCharacterId(null)}
      />
      <LocationDetailModal
        locationId={modalLocationId}
        isOpen={!!modalLocationId}
        onClose={() => setModalLocationId(null)}
      />
    </div>
  );
};
