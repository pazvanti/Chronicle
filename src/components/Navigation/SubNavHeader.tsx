import React from 'react';
import { useEpub } from '../../context/EpubContext';
import { AppViewMode } from '../../types/project';
import { useTranslation } from '../../i18n/I18nContext';
import {
  Edit3,
  BookOpen,
  Terminal,
  Clock,
  LayoutGrid,
  Users,
  Compass,
  Image as ImageIcon,
  Palette,
  ListOrdered,
  Tag,
  FolderArchive,
  Share2,
} from 'lucide-react';

export const SubNavHeader: React.FC = () => {
  const {
    book,
    primaryMode,
    viewMode,
    setViewMode,
    minimalistMode,
    isZenMode,
    characters,
    locations,
    timelines,
    totalWordCount,
    totalReadingTimeMinutes,
    setIsExportModalOpen,
    isCharacterSidebarOpen,
    setIsCharacterSidebarOpen,
    isLocationSidebarOpen,
    setIsLocationSidebarOpen,
  } = useEpub();
  const { t } = useTranslation();

  if (isZenMode || minimalistMode || !book) {
    return null;
  }

  // 1. Write Canvas Items
  const writeCanvasItems: {
    id: AppViewMode;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    title: string;
  }[] = [
    {
      id: 'editor',
      label: t('subNav.editor'),
      icon: <Edit3 size={14} />,
      badge: totalWordCount > 0 ? `${totalWordCount.toLocaleString()} w` : undefined,
      title: t('subNav.editorTitle'),
    },
    {
      id: 'reader',
      label: t('subNav.reader'),
      icon: <BookOpen size={14} />,
      badge: `${totalReadingTimeMinutes}m read`,
      title: t('subNav.readerTitle'),
    },
    {
      id: 'inspector',
      label: t('subNav.inspect'),
      icon: <Terminal size={14} />,
      title: t('subNav.inspectTitle'),
    },
  ];

  // 2. Knowledge Base Items
  const knowledgeBaseItems: {
    id: AppViewMode;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    title: string;
  }[] = [
    {
      id: 'cast-grid',
      label: t('subNav.presenceGrid'),
      icon: <LayoutGrid size={14} />,
      badge: characters.length + locations.length > 0 ? characters.length + locations.length : undefined,
      title: t('subNav.presenceGridTitle'),
    },
    {
      id: 'timeline',
      label: t('subNav.timeline'),
      icon: <Clock size={14} />,
      badge: timelines.length > 0 ? timelines.length : undefined,
      title: t('subNav.timelineTitle'),
    },
    {
      id: 'characters',
      label: t('subNav.characters'),
      icon: <Users size={14} />,
      badge: characters.length > 0 ? characters.length : undefined,
      title: t('subNav.charactersTitle'),
    },
    {
      id: 'locations',
      label: t('subNav.locations'),
      icon: <Compass size={14} />,
      badge: locations.length > 0 ? locations.length : undefined,
      title: t('subNav.locationsTitle'),
    },
  ];

  // 3. Publish Items
  const publishItems: {
    id: AppViewMode;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    title: string;
  }[] = [
    {
      id: 'cover',
      label: t('subNav.coverStudio'),
      icon: <ImageIcon size={14} />,
      title: t('subNav.coverStudioTitle'),
    },
    {
      id: 'styles',
      label: t('subNav.stylesCss'),
      icon: <Palette size={14} />,
      title: t('subNav.stylesCssTitle'),
    },
    {
      id: 'toc',
      label: t('subNav.tableOfContents'),
      icon: <ListOrdered size={14} />,
      badge: book.chapters.length > 0 ? book.chapters.length : undefined,
      title: t('subNav.tableOfContentsTitle'),
    },
    {
      id: 'metadata',
      label: t('subNav.metadata'),
      icon: <Tag size={14} />,
      title: t('subNav.metadataTitle'),
    },
    {
      id: 'assets',
      label: t('subNav.assets'),
      icon: <FolderArchive size={14} />,
      badge: book.assets.length > 0 ? book.assets.length : undefined,
      title: t('subNav.assetsTitle'),
    },
  ];

  const handleWriteItemClick = (id: AppViewMode) => {
    setIsCharacterSidebarOpen(false);
    setIsLocationSidebarOpen(false);
    setViewMode(id);
  };

  const handleKnowledgeBaseItemInWriteModeClick = (id: AppViewMode) => {
    if (id === 'characters') {
      if (viewMode !== 'editor') {
        setViewMode('editor');
      }
      setIsLocationSidebarOpen(false);
      setIsCharacterSidebarOpen(prev => !prev);
    } else if (id === 'locations') {
      if (viewMode !== 'editor') {
        setViewMode('editor');
      }
      setIsCharacterSidebarOpen(false);
      setIsLocationSidebarOpen(prev => !prev);
    } else {
      setIsCharacterSidebarOpen(false);
      setIsLocationSidebarOpen(false);
      setViewMode(id);
    }
  };

  return (
    <div className="sub-nav-header" role="navigation" aria-label="Contextual workspace navigation">
      {primaryMode === 'write' ? (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Left: Writing Canvas Tools */}
          <div className="sub-nav-tabs">
            {writeCanvasItems.map(item => {
              const isActive = viewMode === item.id;
              return (
                <button
                  key={item.id}
                  className={`sub-nav-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleWriteItemClick(item.id)}
                  title={item.title}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`sub-nav-badge ${isActive ? 'badge-active' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Knowledge Base Tools (Drawers in Writing mode, full tools on click) */}
          <div className="sub-nav-tabs">
            {knowledgeBaseItems.map(item => {
              let isActive = false;
              if (item.id === 'characters') {
                isActive = isCharacterSidebarOpen && viewMode === 'editor';
              } else if (item.id === 'locations') {
                isActive = isLocationSidebarOpen && viewMode === 'editor';
              } else {
                isActive = viewMode === item.id;
              }

              const dynamicTitle =
                item.id === 'characters'
                  ? (isCharacterSidebarOpen ? t('subNav.closeCharacterSidebar') : t('subNav.openCharacterSidebar'))
                  : item.id === 'locations'
                  ? (isLocationSidebarOpen ? t('subNav.closeLocationSidebar') : t('subNav.openLocationSidebar'))
                  : item.title;

              return (
                <button
                  key={item.id}
                  className={`sub-nav-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleKnowledgeBaseItemInWriteModeClick(item.id)}
                  title={dynamicTitle}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`sub-nav-badge ${isActive ? 'badge-active' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : primaryMode === 'knowledge-base' ? (
        <div className="sub-nav-tabs">
          {knowledgeBaseItems.map(item => {
            const isActive = viewMode === item.id;
            return (
              <button
                key={item.id}
                className={`sub-nav-pill ${isActive ? 'active' : ''}`}
                onClick={() => setViewMode(item.id)}
                title={item.title}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`sub-nav-badge ${isActive ? 'badge-active' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="sub-nav-tabs">
            {publishItems.map(item => {
              const isActive = viewMode === item.id;
              return (
                <button
                  key={item.id}
                  className={`sub-nav-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setViewMode(item.id)}
                  title={item.title}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`sub-nav-badge ${isActive ? 'badge-active' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            className="btn btn-sm btn-primary sub-nav-export-btn"
            onClick={() => setIsExportModalOpen(true)}
            title={t('subNav.exportHubTitle')}
          >
            <Share2 size={13} />
            <span>{t('subNav.exportHubBtn')}</span>
          </button>
        </>
      )}
    </div>
  );
};
