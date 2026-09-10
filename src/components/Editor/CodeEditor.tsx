import React, { useState, useEffect, useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { Code, RefreshCw, Scissors } from 'lucide-react';
import { SplitChapterModal } from './SplitChapterModal';

export const CodeEditor: React.FC = () => {
  const { activeChapter, updateChapterContent } = useEpub();
  const [code, setCode] = useState<string>('');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeChapter) {
      setCode(activeChapter.content);
    }
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when chapter ID changes, not on keystroke updates
  }, [activeChapter?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    if (activeChapter) {
      updateChapterContent(activeChapter.id, val);
    }
  };

  const handleFormatCode = () => {
    if (!code) return;
    try {
      // Basic tidy format
      const formatted = code
        .replace(/></g, '>\n<')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');
      setCode(formatted);
      if (activeChapter) {
        updateChapterContent(activeChapter.id, formatted);
      }
    } catch {
      // ignore
    }
  };

  if (!activeChapter) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a chapter to edit
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sub-toolbar">
        <div className="toolbar-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Code size={16} />
            <span>XHTML Source Editor</span>
          </div>
        </div>

        <div className="toolbar-group">
          <button className="btn btn-outline btn-sm" onClick={handleFormatCode} title="Format HTML code">
            <RefreshCw size={13} />
            <span>Format HTML</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsSplitModalOpen(true)}>
            <Scissors size={14} />
            <span>Split Chapter</span>
          </button>
        </div>
      </div>

      <div className="code-editor-container">
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={handleChange}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>

      {isSplitModalOpen && (
        <SplitChapterModal onClose={() => setIsSplitModalOpen(false)} />
      )}
    </div>
  );
};
