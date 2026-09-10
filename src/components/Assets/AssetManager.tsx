import React, { useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { Plus, Image as ImageIcon, FileCode, FileType } from 'lucide-react';
import { EpubAsset } from '../../types/epub';
import { formatBytes } from '../../services/epub/pathUtils';

export const AssetManager: React.FC = () => {
  const { book, showNotification } = useEpub();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!book) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No book loaded
      </div>
    );
  }

  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && book) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const blobUrl = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: file.type }));
      const id = `asset_${Date.now()}`;
      const folder = file.type.startsWith('image/') ? 'Images/' : file.type.includes('css') ? 'Styles/' : 'Misc/';
      const href = `${folder}${file.name}`;
      const fullPath = book.opfDir ? `${book.opfDir}${href}` : `OEBPS/${href}`;

      const newAsset: EpubAsset = {
        id,
        href,
        fullPath,
        mediaType: file.type || 'application/octet-stream',
        size: bytes.length,
        blobUrl,
        data: bytes,
      };

      book.assets.push(newAsset);
      book.manifest[id] = {
        id,
        href,
        fullPath,
        mediaType: newAsset.mediaType,
      };
      book.rawFiles.set(fullPath, bytes);

      showNotification('success', `Added asset "${file.name}" to book!`);
    }
  };

  const getAssetIcon = (mediaType: string) => {
    if (mediaType.startsWith('image/')) return <ImageIcon size={20} color="var(--accent-primary)" />;
    if (mediaType.includes('css')) return <FileCode size={20} color="var(--accent-cyan)" />;
    return <FileType size={20} color="var(--accent-warning)" />;
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
            Asset Manager
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Embedded images, stylesheets, fonts, and media files ({book.assets.length} items)
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleUploadAsset}
          />
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>
            <Plus size={15} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {book.assets.map(asset => (
          <div
            key={asset.id}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            {asset.blobUrl && asset.mediaType.startsWith('image/') ? (
              <div
                style={{
                  height: '110px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  background: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={asset.blobUrl}
                  alt={asset.id}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div
                style={{
                  height: '110px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getAssetIcon(asset.mediaType)}
              </div>
            )}

            <div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={asset.href}
              >
                {asset.href.split('/').pop()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {formatBytes(asset.size)} • {asset.mediaType.split('/')[1] || asset.mediaType}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
