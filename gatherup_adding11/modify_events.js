const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/EventsPage.jsx', 'utf8');

const oldFilter = `<input
          type="date"
          className="input-field w-auto"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          type="date"
          className="input-field w-auto"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />`;

const newFilter = `<div className="flex items-center gap-2">
          <input
            type="date"
            className="input-field max-w-[140px] text-xs py-1.5 px-3"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <span className="text-sm font-medium text-clay-muted">to</span>
          <input
            type="date"
            className="input-field max-w-[140px] text-xs py-1.5 px-3"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>`;

code = code.replace(oldFilter, newFilter);
fs.writeFileSync('frontend/src/pages/EventsPage.jsx', code);
