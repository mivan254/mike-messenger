import React, { useState, useEffect, useCallback } from 'react';
import './Stickers.css';

// Built-in animated emoji-style sticker pack (works offline, no API needed)
const STATIC_PACKS = {
  'Love': ['😍','🥰','😘','💕','💖','💗','💓','💞','😻','💏'],
  'Happy': ['😂','🤣','😆','😁','🎉','🥳','😄','🙌','✨','🤩'],
  'Sad': ['😢','😭','💔','😞','😔','🥺','😿','😣','😩','😥'],
  'Love you': ['❤️','💘','💝','😻','💋','🌹','💑','👩‍❤️‍👨','💍','😍'],
  'Wow': ['😱','🤯','😲','🙀','😮','👀','‼️','💥','⚡','🌟'],
  'Funny': ['🤪','😜','🤡','🐵','🙈','😝','🤓','🥴','🫠','😵‍💫'],
};

const GIPHY_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // Public Giphy demo API key

const Stickers = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [activePack, setActivePack] = useState('Love');
  const [gifResults, setGifResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = useCallback(async (query) => {
    setLoading(true);
    try {
      const endpoint = query
        ? `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_KEY}&limit=24&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifResults(data.data || []);
    } catch (err) {
      console.error('Sticker fetch failed:', err);
      setGifResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGifs('');
  }, [fetchGifs]);

  useEffect(() => {
    if (!search) return;
    const timer = setTimeout(() => fetchGifs(search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchGifs]);

  const handleStaticSelect = (emoji) => {
    onSelect({ type: 'emoji-sticker', content: emoji });
  };

  const handleGifSelect = (gif) => {
    const url = gif.images?.fixed_height?.url || gif.images?.original?.url;
    onSelect({ type: 'gif-sticker', content: url, alt: gif.title });
  };

  return (
    <div className="stickers-picker">
      <div className="stickers-search">
        <input
          placeholder="🔍 Search animated stickers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <button className="stickers-close" onClick={onClose}>✕</button>
      </div>

      {!search && (
        <div className="stickers-categories">
          {Object.keys(STATIC_PACKS).map((pack) => (
            <button
              key={pack}
              className={`stickers-cat-btn ${activePack === pack ? 'active' : ''}`}
              onClick={() => setActivePack(pack)}
            >
              {pack}
            </button>
          ))}
        </div>
      )}

      {!search && (
        <div className="stickers-static-grid">
          {STATIC_PACKS[activePack].map((emoji, i) => (
            <button
              key={i}
              className="sticker-static-item"
              onClick={() => handleStaticSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="stickers-section-label">
        {search ? `Results for "${search}"` : '🔥 Trending Animated Stickers'}
      </div>

      <div className="stickers-gif-grid">
        {loading && <div className="stickers-loading">Loading stickers...</div>}
        {!loading && gifResults.length === 0 && (
          <div className="stickers-empty">No stickers found</div>
        )}
        {!loading && gifResults.map((gif) => (
          <button
            key={gif.id}
            className="sticker-gif-item"
            onClick={() => handleGifSelect(gif)}
            title={gif.title}
          >
            <img
              src={gif.images?.fixed_height_small?.url || gif.images?.fixed_height?.url}
              alt={gif.title}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Stickers;