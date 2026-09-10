import React, { useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import { Database, Layers } from 'lucide-react';
import { formatBytes } from '../../services/epub/pathUtils';

export const EpubInspector: React.FC = () => {
  const { book } = useEpub();

  const totalWords = useMemo(() => {
    if (!book) return 0;
    return book.chapters.reduce((acc, c) => acc + c.wordCount, 0);
  }, [book]);

  const totalAssetsSize = useMemo(() => {
    if (!book) return 0;
    return book.assets.reduce((acc, a) => acc + a.size, 0);
  }, [book]);

  if (!book) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No book loaded
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
          EPUB Technical Inspector
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Container structure, OPF manifest table, and spine sequencing diagnostics
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>EPUB Version</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
            {book.version || '3.0'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Chapters</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {book.chapters.length}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Word Count</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {totalWords.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Assets Size</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {formatBytes(totalAssetsSize)}
          </div>
        </div>
      </div>

      {/* Package OPF Details */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={16} color="var(--accent-primary)" />
          <span>Container Paths</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Rootfile OPF Path:</span>
          <code style={{ color: 'var(--accent-cyan)' }}>{book.opfPath}</code>

          <span style={{ color: 'var(--text-muted)' }}>EPUB3 Nav Path:</span>
          <code style={{ color: 'var(--accent-cyan)' }}>{book.navPath || 'Auto-generated on export (nav.xhtml)'}</code>

          <span style={{ color: 'var(--text-muted)' }}>EPUB2 NCX Path:</span>
          <code style={{ color: 'var(--accent-cyan)' }}>{book.tocPath || 'Auto-generated on export (toc.ncx)'}</code>

          <span style={{ color: 'var(--text-muted)' }}>Cover Manifest ID:</span>
          <code>{book.coverManifestId || 'None'}</code>
        </div>
      </div>

      {/* Manifest Table */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={16} color="var(--accent-primary)" />
          <span>Manifest Items ({Object.keys(book.manifest).length})</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Item ID</th>
                <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Href</th>
                <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Media-Type</th>
                <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Properties</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(book.manifest).map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.id}</td>
                  <td style={{ padding: '0.5rem 0.8rem', color: 'var(--accent-cyan)' }}>{item.href}</td>
                  <td style={{ padding: '0.5rem 0.8rem', color: 'var(--text-secondary)' }}>{item.mediaType}</td>
                  <td style={{ padding: '0.5rem 0.8rem', color: 'var(--accent-warning)' }}>{item.properties || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
