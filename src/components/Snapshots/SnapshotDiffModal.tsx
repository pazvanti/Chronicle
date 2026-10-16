import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  FileText,
  Clock,
  Filter,
  Undo2,
  CheckCheck,
  Plus,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';
import { useEpub } from '../../context/EpubContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { StorySnapshot } from '../../types/project';
import {
  computeChapterDiffSummary,
  applyDiffRowToCurrentHtml,
  applyIntraParagraphChangeToCurrentHtml,
  buildParagraphSegments,
  DiffRow,
  ChapterDiffSummary,
  IntraParagraphChange,
} from '../../services/diff/snapshotDiffService';

interface SnapshotDiffModalProps {
  snapshot: StorySnapshot;
  onClose: () => void;
  initialChapterId?: string;
}

interface UndoEntry {
  chapterId: string;
  previousHtml: string;
  label: string;
}

export const SnapshotDiffModal: React.FC<SnapshotDiffModalProps> = ({
  snapshot,
  onClose,
  initialChapterId,
}) => {
  const {
    book,
    updateChapterContent,
    restoreSnapshot,
    showNotification,
    setActiveChapterId,
    activeChapterId,
    refreshBookSession,
  } = useEpub();

  // Combine and order all chapters from current book and snapshot
  const currentChapters = book?.chapters || [];
  const snapshotChapters = snapshot.data.chapters || [];

  const allChapterIds = useMemo(() => {
    const ids: string[] = [];
    currentChapters.forEach(c => {
      if (!ids.includes(c.id)) ids.push(c.id);
    });
    snapshotChapters.forEach(c => {
      if (!ids.includes(c.id)) ids.push(c.id);
    });
    return ids;
  }, [currentChapters, snapshotChapters]);

  const [selectedChapterId, setSelectedChapterId] = useState<string>(() => {
    if (initialChapterId && allChapterIds.includes(initialChapterId)) {
      return initialChapterId;
    }
    // Find first modified chapter, otherwise first chapter
    for (const id of allChapterIds) {
      const cur = currentChapters.find(c => c.id === id);
      const snap = snapshotChapters.find(c => c.id === id);
      if (cur?.content !== snap?.content) {
        return id;
      }
    }
    return allChapterIds[0] || '';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'changed'>('all');
  const [filterOnlyDiffs, setFilterOnlyDiffs] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  useEscapeKey(onClose);

  // Active chapters for selected ID
  const activeCurrentChapter = currentChapters.find(c => c.id === selectedChapterId);
  const activeSnapshotChapter = snapshotChapters.find(c => c.id === selectedChapterId);

  const chapterTitle =
    activeCurrentChapter?.title ||
    activeSnapshotChapter?.title ||
    'Untitled Chapter';

  // Compute diff for currently selected chapter
  const currentSummary: ChapterDiffSummary = useMemo(() => {
    return computeChapterDiffSummary(
      selectedChapterId,
      chapterTitle,
      activeCurrentChapter?.content,
      activeSnapshotChapter?.content
    );
  }, [selectedChapterId, chapterTitle, activeCurrentChapter?.content, activeSnapshotChapter?.content]);

  // Compute status for all chapters for navigation bar pills
  const chapterSummariesMap = useMemo(() => {
    const map = new Map<string, { status: string; totalChanges: number }>();
    allChapterIds.forEach(id => {
      const cur = currentChapters.find(c => c.id === id);
      const snap = snapshotChapters.find(c => c.id === id);

      // 1. Fast-path identical content or both absent
      if (cur?.content === snap?.content) {
        map.set(id, {
          status: 'identical',
          totalChanges: 0,
        });
        return;
      }

      // 2. Fast-path added or deleted in snapshot
      if (!cur && snap) {
        map.set(id, {
          status: 'added_in_snapshot',
          totalChanges: 1,
        });
        return;
      }
      if (cur && !snap) {
        map.set(id, {
          status: 'deleted_in_snapshot',
          totalChanges: 1,
        });
        return;
      }

      // 3. Reuse currentSummary directly for active chapter if available
      if (id === selectedChapterId && currentSummary) {
        map.set(id, {
          status: currentSummary.status,
          totalChanges: currentSummary.modifiedCount + currentSummary.addedCount + currentSummary.removedCount,
        });
        return;
      }

      // 4. Compute diff summary for non-identical chapters (benefits from prefix/suffix trimming)
      const sum = computeChapterDiffSummary(id, cur?.title || snap?.title || '', cur?.content, snap?.content);
      map.set(id, {
        status: sum.status,
        totalChanges: sum.modifiedCount + sum.addedCount + sum.removedCount,
      });
    });
    return map;
  }, [allChapterIds, currentChapters, snapshotChapters, selectedChapterId, currentSummary]);

  // Total changes across whole manuscript
  const totalManuscriptChanges = useMemo(() => {
    let count = 0;
    chapterSummariesMap.forEach(val => {
      count += val.totalChanges;
    });
    return count;
  }, [chapterSummariesMap]);

  // Number of changed chapters
  const changedChapterCount = useMemo(() => {
    let count = 0;
    chapterSummariesMap.forEach(val => {
      if (val.status !== 'identical') count++;
    });
    return count;
  }, [chapterSummariesMap]);

  // Filtered sidebar chapter IDs based on search and filter tab
  const filteredSidebarChapterIds = useMemo(() => {
    return allChapterIds.filter(id => {
      const meta = chapterSummariesMap.get(id);
      const isChanged = meta ? meta.status !== 'identical' : false;

      if (sidebarFilter === 'changed' && !isChanged) {
        return false;
      }

      if (sidebarSearch.trim()) {
        const cur = currentChapters.find(c => c.id === id);
        const snap = snapshotChapters.find(c => c.id === id);
        const title = (cur?.title || snap?.title || '').toLowerCase();
        const q = sidebarSearch.toLowerCase().trim();
        return title.includes(q);
      }

      return true;
    });
  }, [allChapterIds, currentChapters, snapshotChapters, chapterSummariesMap, sidebarFilter, sidebarSearch]);

  // Navigation handlers
  const currentIndex = allChapterIds.indexOf(selectedChapterId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allChapterIds.length - 1;

  const handlePrevChapter = () => {
    if (hasPrev) setSelectedChapterId(allChapterIds[currentIndex - 1]);
  };

  const handleNextChapter = () => {
    if (hasNext) setSelectedChapterId(allChapterIds[currentIndex + 1]);
  };

  // 1-Click Restore single row
  const handleRestoreDiffRow = (row: DiffRow) => {
    if (!activeCurrentChapter) {
      showNotification('error', 'Chapter does not exist in current manuscript');
      return;
    }

    const previousHtml = activeCurrentChapter.content;
    const updatedHtml = applyDiffRowToCurrentHtml(
      previousHtml,
      currentSummary.diffRows,
      row.id
    );

    if (updatedHtml === previousHtml) return;

    // Push to undo stack
    setUndoStack(prev => [
      {
        chapterId: selectedChapterId,
        previousHtml,
        label: `Restore ${row.type} paragraph`,
      },
      ...prev.slice(0, 19),
    ]);

    updateChapterContent(selectedChapterId, updatedHtml);
    refreshBookSession();
    if (activeChapterId !== selectedChapterId) {
      setActiveChapterId(selectedChapterId);
    }
    showNotification('success', `Restored paragraph from snapshot to current chapter`);
  };

  // 1-Click Restore single word or small change within a paragraph
  const handleRestoreIntraParagraphChange = (row: DiffRow, change: IntraParagraphChange) => {
    if (!activeCurrentChapter) {
      showNotification('error', 'Chapter does not exist in current manuscript');
      return;
    }

    const previousHtml = activeCurrentChapter.content;
    const updatedHtml = applyIntraParagraphChangeToCurrentHtml(
      previousHtml,
      currentSummary.diffRows,
      row.id,
      change.id
    );

    if (updatedHtml === previousHtml) return;

    const actionVerb =
      change.type === 'added' ? 'Inserted' : change.type === 'removed' ? 'Deleted' : 'Restored';
    const label = `${actionVerb} "${change.displayText}"`;

    // Push to undo stack
    setUndoStack(prev => [
      {
        chapterId: selectedChapterId,
        previousHtml,
        label,
      },
      ...prev.slice(0, 19),
    ]);

    updateChapterContent(selectedChapterId, updatedHtml);
    refreshBookSession();
    if (activeChapterId !== selectedChapterId) {
      setActiveChapterId(selectedChapterId);
    }
    showNotification('success', `Restored "${change.displayText}" from snapshot into current chapter`);
  };

  // 1-Click Apply all changes in this chapter
  const handleApplyAllChapterChanges = () => {
    if (!activeCurrentChapter || !activeSnapshotChapter) return;

    const previousHtml = activeCurrentChapter.content;
    const newHtml = activeSnapshotChapter.content;

    setUndoStack(prev => [
      {
        chapterId: selectedChapterId,
        previousHtml,
        label: `Restore all changes in "${chapterTitle}"`,
      },
      ...prev.slice(0, 19),
    ]);

    updateChapterContent(selectedChapterId, newHtml);
    refreshBookSession();
    if (activeChapterId !== selectedChapterId) {
      setActiveChapterId(selectedChapterId);
    }
    showNotification('success', `Restored all snapshot changes to "${chapterTitle}"`);
  };

  const handleRestoreDeletedChapter = () => {
    if (!activeSnapshotChapter) return;
    restoreSnapshot(snapshot.id, {
      chapters: true,
      selectedChapterIds: [selectedChapterId],
    });
    showNotification('success', `Restored chapter "${chapterTitle}" to current manuscript`);
  };

  // Undo last action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [lastAction, ...rest] = undoStack;
    updateChapterContent(lastAction.chapterId, lastAction.previousHtml);
    setUndoStack(rest);
    refreshBookSession();
    if (activeChapterId !== lastAction.chapterId) {
      setActiveChapterId(lastAction.chapterId);
    }
    showNotification('info', `Undid: ${lastAction.label}`);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1400, backgroundColor: 'rgba(0, 0, 0, 0.82)' }}
      onClick={onClose}
    >
      <div
        className="snapshot-diff-modal-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Main Header */}
        <div className="snapshot-diff-modal-header">
          <div className="snapshot-diff-header-left">
            <div className="snapshot-diff-header-badge">
              <GitCompare size={20} />
            </div>
            <div>
              <div className="snapshot-diff-title-row">
                <h3 className="snapshot-diff-modal-title">Time Machine Chapter Diff & Merge</h3>
                <span className="snapshot-diff-pill">
                  Comparing with: <strong>"{snapshot.name}"</strong> ({totalManuscriptChanges} {totalManuscriptChanges === 1 ? 'change' : 'changes'} across manuscript)
                </span>
                <span className="snapshot-diff-date">
                  <Clock size={12} />
                  {formatDate(snapshot.createdAt)}
                </span>
              </div>
              <p className="snapshot-diff-subtitle">
                Side-by-side manuscript comparison • Review and restore paragraphs from this snapshot into your current draft
              </p>
            </div>
          </div>

          <div className="snapshot-diff-header-actions">
            {undoStack.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-ghost snapshot-diff-undo-btn"
                onClick={handleUndo}
                title={`Undo last restore: ${undoStack[0].label}`}
              >
                <Undo2 size={14} />
                <span>Undo Restore ({undoStack.length})</span>
              </button>
            )}

            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={onClose}
              aria-label="Close diff viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2-Column Main Layout: Left Sidebar + Right Side-by-Side Diff */}
        <div className="snapshot-diff-main-layout">
          {/* Left Vertical Sidebar */}
          {isSidebarOpen && (
            <aside className="snapshot-diff-sidebar">
              <div className="snapshot-diff-sidebar-header">
                <div className="snapshot-diff-sidebar-title-row">
                  <div className="snapshot-diff-sidebar-title-group">
                    <BookOpen size={15} />
                    <span>Chapters</span>
                    <span className="snapshot-diff-sidebar-count">{allChapterIds.length}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-icon btn-sm"
                    onClick={() => setIsSidebarOpen(false)}
                    title="Collapse chapters sidebar"
                  >
                    <PanelLeftClose size={15} />
                  </button>
                </div>

                {/* Quick Search */}
                <div className="snapshot-diff-sidebar-search">
                  <Search size={13} className="snapshot-diff-sidebar-search-icon" />
                  <input
                    type="text"
                    placeholder="Search chapters..."
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                    className="snapshot-diff-sidebar-search-input"
                  />
                  {sidebarSearch && (
                    <button
                      type="button"
                      className="snapshot-diff-sidebar-search-clear"
                      onClick={() => setSidebarSearch('')}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs: All vs Changed */}
                <div className="snapshot-diff-sidebar-filter-tabs">
                  <button
                    type="button"
                    className={`snapshot-diff-sidebar-filter-tab ${sidebarFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSidebarFilter('all')}
                  >
                    All ({allChapterIds.length})
                  </button>
                  <button
                    type="button"
                    className={`snapshot-diff-sidebar-filter-tab ${sidebarFilter === 'changed' ? 'active' : ''}`}
                    onClick={() => setSidebarFilter('changed')}
                  >
                    Changed ({changedChapterCount})
                  </button>
                </div>
              </div>

              {/* Scrollable Chapter List */}
              <div className="snapshot-diff-sidebar-list">
                {filteredSidebarChapterIds.length === 0 ? (
                  <div className="snapshot-diff-sidebar-empty">
                    <span>No chapters match this filter</span>
                  </div>
                ) : (
                  filteredSidebarChapterIds.map(id => {
                    const globalIndex = allChapterIds.indexOf(id);
                    const cur = currentChapters.find(c => c.id === id);
                    const snap = snapshotChapters.find(c => c.id === id);
                    const title = cur?.title || snap?.title || `Chapter ${globalIndex + 1}`;
                    const isSelected = id === selectedChapterId;
                    const meta = chapterSummariesMap.get(id);
                    const status = meta?.status || 'identical';
                    const changeCount = meta?.totalChanges || 0;

                    return (
                      <button
                        key={id}
                        type="button"
                        className={`snapshot-diff-sidebar-item ${isSelected ? 'active' : ''} ${status}`}
                        onClick={() => setSelectedChapterId(id)}
                      >
                        <div className="snapshot-diff-sidebar-item-top">
                          <span className="snapshot-diff-sidebar-item-order">{globalIndex + 1}.</span>
                          <span className="snapshot-diff-sidebar-item-title" title={title}>
                            {title}
                          </span>
                        </div>

                        <div className="snapshot-diff-sidebar-item-bottom">
                          {status === 'identical' ? (
                            <span className="snapshot-diff-sidebar-badge identical" title="Identical in both versions">
                              <Check size={11} />
                              <span>Identical</span>
                            </span>
                          ) : status === 'added_in_snapshot' ? (
                            <span className="snapshot-diff-sidebar-badge added" title="Only present in snapshot">
                              <Plus size={11} />
                              <span>In Snapshot Only</span>
                            </span>
                          ) : status === 'deleted_in_snapshot' ? (
                            <span className="snapshot-diff-sidebar-badge removed" title="Only present in current draft">
                              <span>In Current Only</span>
                            </span>
                          ) : (
                            <span className="snapshot-diff-sidebar-badge modified" title={`${changeCount} paragraph changes`}>
                              <span className="snapshot-diff-badge-dot" />
                              <span>{changeCount} {changeCount === 1 ? 'change' : 'changes'}</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="snapshot-diff-sidebar-footer">
                <span>{changedChapterCount} changed</span>
                <span>{allChapterIds.length - changedChapterCount} identical</span>
              </div>
            </aside>
          )}

          {/* Right Main Content Area */}
          <div className="snapshot-diff-content-area">
            {/* Action Toolbar for current Chapter */}
            <div className="snapshot-diff-content-toolbar">
              <div className="snapshot-diff-toolbar-left">
                {!isSidebarOpen && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm snapshot-diff-open-sidebar-btn"
                    onClick={() => setIsSidebarOpen(true)}
                    title="Show chapters sidebar"
                  >
                    <PanelLeftOpen size={16} />
                    <span>Chapters ({allChapterIds.length})</span>
                  </button>
                )}

                <div className="snapshot-diff-nav-controls">
                  <button
                    type="button"
                    className="btn-icon btn-sm snapshot-diff-nav-arrow"
                    onClick={handlePrevChapter}
                    disabled={!hasPrev}
                    title="Previous chapter"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="snapshot-diff-nav-counter">
                    Chapter {currentIndex + 1} of {allChapterIds.length}
                  </span>
                  <button
                    type="button"
                    className="btn-icon btn-sm snapshot-diff-nav-arrow"
                    onClick={handleNextChapter}
                    disabled={!hasNext}
                    title="Next chapter"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <h4 className="snapshot-diff-toolbar-chapter-title" title={chapterTitle}>
                  {chapterTitle}
                </h4>
              </div>

              {/* Filter & Batch Actions */}
              <div className="snapshot-diff-toolbar-actions">
                <button
                  type="button"
                  className={`snapshot-diff-filter-btn ${filterOnlyDiffs ? 'active' : ''}`}
                  onClick={() => setFilterOnlyDiffs(!filterOnlyDiffs)}
                  title={filterOnlyDiffs ? 'Show all paragraphs including unchanged' : 'Show only changed paragraphs'}
                >
                  <Filter size={13} />
                  <span>{filterOnlyDiffs ? 'Showing Changes Only' : 'Show Only Changes'}</span>
                </button>

                {currentSummary.status === 'modified' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary snapshot-diff-apply-all-btn"
                    onClick={handleApplyAllChapterChanges}
                    title="Restore current chapter with entire snapshot version"
                  >
                    <ArrowLeft size={14} />
                    <span>Restore All Snapshot Changes</span>
                  </button>
                )}

                {currentSummary.status === 'added_in_snapshot' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary snapshot-diff-apply-all-btn"
                    onClick={handleRestoreDeletedChapter}
                    title="Restore this entire chapter from snapshot into current manuscript"
                  >
                    <Plus size={14} />
                    <span>Restore Chapter to Current</span>
                  </button>
                )}
              </div>
            </div>

        {/* Comparison Header Bar (Left = Current, Right = Snapshot) */}
        <div className="snapshot-diff-pane-headers">
          <div className="snapshot-diff-pane-header left">
            <div className="snapshot-diff-pane-header-info">
              <span className="snapshot-diff-pane-tag current">Current Version</span>
              <h4 className="snapshot-diff-pane-title">
                {activeCurrentChapter?.title || 'Chapter Not in Current Manuscript'}
              </h4>
            </div>
            <div className="snapshot-diff-pane-metrics">
              <span className="snapshot-diff-metric-pill">
                <FileText size={12} />
                {(currentSummary.currentWordCount || 0).toLocaleString()} words
              </span>
            </div>
          </div>

          <div className="snapshot-diff-pane-header-divider">
            <span>Restore</span>
          </div>

          <div className="snapshot-diff-pane-header right">
            <div className="snapshot-diff-pane-header-info">
              <span className="snapshot-diff-pane-tag snapshot">
                Snapshot: "{snapshot.name}"
              </span>
              <h4 className="snapshot-diff-pane-title">
                {activeSnapshotChapter?.title || 'Chapter Not in Snapshot'}
              </h4>
            </div>
            <div className="snapshot-diff-pane-metrics">
              <span className="snapshot-diff-metric-pill">
                <FileText size={12} />
                {(currentSummary.snapshotWordCount || 0).toLocaleString()} words
              </span>
              {currentSummary.wordCountDelta !== 0 && (
                <span
                  className={`snapshot-diff-delta-pill ${currentSummary.wordCountDelta > 0 ? 'positive' : 'negative'
                    }`}
                  title="Word count difference from current to snapshot"
                >
                  {currentSummary.wordCountDelta > 0
                    ? `+${currentSummary.wordCountDelta}`
                    : currentSummary.wordCountDelta}w
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Side-by-Side Diff Content Area */}
        <div className="snapshot-diff-scrollable-body">
          {currentSummary.status === 'identical' ? (
            <div className="snapshot-diff-identical-state">
              <div className="snapshot-diff-identical-icon-box">
                <CheckCheck size={28} />
              </div>
              <h4>Both Versions are Identical</h4>
              <p>
                There are no text differences in <strong>"{chapterTitle}"</strong> between your active working manuscript and snapshot "{snapshot.name}".
              </p>
            </div>
          ) : currentSummary.diffRows.length === 0 ? (
            <div className="snapshot-diff-identical-state">
              <p>No content available to compare in this chapter.</p>
            </div>
          ) : (
            <div className="snapshot-diff-rows-container">
              {currentSummary.diffRows.map(row => {
                if (filterOnlyDiffs && row.type === 'equal') return null;

                const isModified = row.type === 'modified';
                const isAddedInSnapshot = row.type === 'added';
                const isRemovedInSnapshot = row.type === 'removed';

                return (
                  <div key={row.id} className={`snapshot-diff-row ${row.type}`}>
                    {/* LEFT PANE: Current Working Version */}
                    <div className="snapshot-diff-cell left">
                      <div className="snapshot-diff-line-number">
                        {row.leftIndex ? `P${row.leftIndex}` : '—'}
                      </div>
                      <div className="snapshot-diff-cell-content">
                        {row.leftBlock ? (
                          <div className="snapshot-diff-text">
                            {row.leftBlock.text}
                          </div>
                        ) : (
                          <div className="snapshot-diff-empty-placeholder">
                            <span>(Paragraph absent in current version)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CENTER ACTION GUTTER: 1-Click Restore Button */}
                    <div className="snapshot-diff-gutter-cell">
                      {isModified && (
                        <button
                          type="button"
                          className="snapshot-diff-gutter-btn modify"
                          onClick={() => handleRestoreDiffRow(row)}
                          title="Restore snapshot paragraph into current working copy"
                        >
                          <ArrowLeft size={13} />
                          <span>Restore</span>
                        </button>
                      )}

                      {isAddedInSnapshot && (
                        <button
                          type="button"
                          className="snapshot-diff-gutter-btn insert"
                          onClick={() => handleRestoreDiffRow(row)}
                          title="Restore this snapshot paragraph into current draft"
                        >
                          <ArrowLeft size={13} />
                          <span>Restore</span>
                        </button>
                      )}

                      {isRemovedInSnapshot && (
                        <button
                          type="button"
                          className="snapshot-diff-gutter-btn revert"
                          onClick={() => handleRestoreDiffRow(row)}
                          title="Delete paragraph from current to match snapshot"
                        >
                          <ArrowLeft size={13} />
                          <span>Delete</span>
                        </button>
                      )}

                      {row.type === 'equal' && (
                        <div className="snapshot-diff-gutter-equal" title="Identical paragraph">
                          <span />
                        </div>
                      )}
                    </div>

                    {/* RIGHT PANE: Snapshot Version with Color Coding */}
                    <div className="snapshot-diff-cell right">
                      <div className="snapshot-diff-line-number">
                        {row.rightIndex ? `P${row.rightIndex}` : '—'}
                      </div>
                      <div className="snapshot-diff-cell-content">
                        {row.rightBlock ? (
                          <div className="snapshot-diff-text">
                            {isModified && row.wordDiff ? (
                              (() => {
                                const segments = buildParagraphSegments(row.wordDiff, row.id);
                                return segments.map((seg, sIdx) => {
                                  if (!seg.isChange || !seg.change) {
                                    return <span key={sIdx}>{seg.equalText}</span>;
                                  }

                                  const change = seg.change;
                                  return (
                                    <span
                                      key={change.id}
                                      className={`diff-word-change-group ${change.type}`}
                                      title={`Click to restore this change: "${change.displayText}"`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRestoreIntraParagraphChange(row, change);
                                      }}
                                    >
                                      {seg.removedText && (
                                        <span className="diff-word-removed" title={`Deleted in snapshot: "${seg.removedText}"`}>
                                          {seg.removedText}
                                        </span>
                                      )}
                                      {seg.addedText && (
                                        <span className="diff-word-added" title={`Added in snapshot: "${seg.addedText}"`}>
                                          {seg.addedText}
                                        </span>
                                      )}

                                      {/* Floating Hover "Restore" Action Pill */}
                                      <button
                                        type="button"
                                        className="diff-word-restore-pill diff-word-move-pill"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRestoreIntraParagraphChange(row, change);
                                        }}
                                        title={`Restore "${change.displayText}" into current draft`}
                                      >
                                        <ArrowLeft size={10} />
                                        <span>Restore</span>
                                      </button>
                                    </span>
                                  );
                                });
                              })()
                            ) : (
                              row.rightBlock.text
                            )}
                          </div>
                        ) : (
                          <div className="snapshot-diff-empty-placeholder">
                            <span>(Paragraph absent in snapshot)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

        {/* Modal Footer */}
        <div className="snapshot-diff-modal-footer">
          <div className="snapshot-diff-footer-stats">
            <span className="snapshot-diff-stat-chip">
              <strong>{currentSummary.modifiedCount}</strong> Modified
            </span>
            <span className="snapshot-diff-stat-chip added">
              <strong>+{currentSummary.addedCount}</strong> In Snapshot
            </span>
            <span className="snapshot-diff-stat-chip removed">
              <strong>-{currentSummary.removedCount}</strong> Only in Current
            </span>
            <span className="snapshot-diff-footer-tip">
              Tip: Hover over any changed word or phrase to <strong>Restore</strong> just that change, or click <strong>← Restore</strong> in the center gutter to restore the whole paragraph.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
