import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from '@docusaurus/router';
import styles from './styles.module.css';
import { Search, FileText } from 'lucide-react';

export default function CustomSearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [docList, setDocList] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const history = useHistory();

  const GITHUB_API_URLS = [
    {
      url: 'https://api.github.com/repos/kuldeepyadav7664/docusaurus/contents/docs',
      prefix: '/docs',
    },
    {
      url: 'https://api.github.com/repos/kuldeepyadav7664/docusaurus/contents/docs/documents',
      prefix: '/docs/documents',
    },
  ];

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        let allFiles = [];

        for (const { url, prefix } of GITHUB_API_URLS) {
          const response = await fetch(url);
          const data = await response.json();

          if (Array.isArray(data)) {
            const files = data
              .filter((item) => item.type === 'file')
              .map((item) => ({
                name: item.name,
                fullPath: `${prefix}/${item.name
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/\.mdx?$/, '')}`,
              }));
            allFiles = [...allFiles, ...files];
          }
        }

        setDocList(allFiles);
      } catch (err) {
        console.error('GitHub fetch error:', err);
      }
    };

    fetchDocs();
  }, []);

  useEffect(() => {
    if (query === '') {
      setSuggestions([]);
      return;
    }

    const match = docList.filter((doc) =>
      doc.name.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(match);
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (doc) => {
    if (!doc || !doc.fullPath) {
      setOpen(false);
      setQuery('');
      setSuggestions([]);
      history.push('/404'); // Or alert('No document found');
      return;
    }

    setOpen(false);
    setQuery('');
    setSuggestions([]);
    history.push(doc.fullPath);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      handleSelect(suggestions[activeIndex]);
    }
  };

  return (
    <>
      <div className={styles.searchActivatorBox} onClick={() => setOpen(true)}>
        <Search className={styles.activatorIcon} />
        <span className={styles.placeholderText}>Search</span>
        <kbd className={styles.shortcutKey}>Ctrl + K</kbd>
      </div>

      {open && (
        <div className={styles.modalBackdrop} onClick={() => setOpen(false)}>
          <div
            className={styles.searchModal}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '640px',
              maxWidth: '90%',
              background: 'var(--ifm-background-color)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <input
              ref={inputRef}
              className={styles.searchInputFull}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search documents..."
            />

            <div className={styles.suggestionList}>
              {suggestions.length > 0 ? (
                <>
                  <div className={styles.suggestionSectionTitle}>Documents</div>
                  {suggestions.map((doc, i) => (
                    <div
                      key={doc.fullPath}
                      className={`${styles.suggestionItem} ${
                        i === activeIndex ? styles.active : ''
                      }`}
                      onClick={() => handleSelect(doc)}
                      tabIndex={0}
                    >
                      <FileText className={styles.suggestionIcon} />
                      {doc.name.replace(/\.mdx?$/, '')}
                    </div>
                  ))}
                </>
              ) : (
                query && <div className={styles.noResults}>No results found</div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--ifm-color-content-secondary)',
                background: 'var(--ifm-background-surface-color)',
                borderTop: '1px solid var(--ifm-color-emphasis-200)',
              }}
            >
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> to navigate
              </span>
              <span>
                <kbd>ESC</kbd> to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
