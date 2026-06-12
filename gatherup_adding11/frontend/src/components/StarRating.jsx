import { useState } from 'react';

export default function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          className={`text-3xl transition ${
            active >= n ? 'scale-110 text-amber-400' : 'text-clay-border'
          } ${readOnly ? 'cursor-default' : 'hover:scale-110'}`}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          onClick={() => !readOnly && onChange?.(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm text-clay-muted">{value}/5</span>}
    </div>
  );
}
