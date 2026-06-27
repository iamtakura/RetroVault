import React from 'react';

export default function SearchBar({
  searchQuery,
  onSearchChange,
  allTags,
  selectedTag,
  onTagSelect,
}) {
  const handleTagClick = (tag) => {
    // If clicking already selected tag, deselect it
    if (selectedTag === tag) {
      onTagSelect(null);
    } else {
      onTagSelect(tag);
    }
  };

  return (
    <div className="search-bar-card">
      <div className="index-card-line" />
      <div className="search-input-wrapper">
        <label htmlFor="vault-search" className="search-icon">⌕</label>
        <input
          id="vault-search"
          type="text"
          className="search-input font-mono"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="SEARCH THE VAULT..."
          autoComplete="off"
        />
      </div>

      {allTags && allTags.length > 0 && (
        <div className="tag-filter-container">
          <span className="tag-label font-mono">TAGS:</span>
          <div className="tag-pills-list">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-pill font-mono ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => handleTagClick(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .search-bar-card {
          position: relative;
          background: #eae3d2; /* Yellowed index card background */
          border: 1px solid #c5baa3;
          border-radius: 4px;
          padding: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          width: 100%;
          margin-bottom: 24px;
          color: #2b231d;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transform: rotate(-0.3deg);
        }

        /* Faint blue line at the top to simulate ruled index cards */
        .index-card-line {
          position: absolute;
          top: 10px;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(30, 144, 255, 0.25);
          pointer-events: none;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: #111; /* Contrast dark input */
          border: 2px solid #2b231d;
          border-radius: 3px;
          padding: 8px 12px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
        }

        .search-icon {
          color: var(--off-white);
          font-size: 18px;
          font-weight: bold;
          margin-right: 8px;
          line-height: 1;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--off-white);
          font-size: 14px;
          outline: none;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .search-input::placeholder {
          color: var(--muted);
          opacity: 0.8;
        }

        /* Tags filters */
        .tag-filter-container {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tag-label {
          font-size: 9px;
          font-weight: bold;
          color: #5b4f43;
          letter-spacing: 0.5px;
        }

        .tag-pills-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tag-pill {
          font-size: 11px;
          color: var(--crimson-bright);
          background: transparent;
          border: 1px solid var(--crimson-bright);
          border-radius: 10px;
          padding: 2px 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .tag-pill:hover {
          background: rgba(176, 16, 32, 0.08);
          transform: translateY(-0.5px);
        }

        .tag-pill.active {
          background: var(--crimson-bright);
          color: #eae3d2;
          box-shadow: 0 0 5px var(--crimson-glow);
        }
      `}</style>
    </div>
  );
}
