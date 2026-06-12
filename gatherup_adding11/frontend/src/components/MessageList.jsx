/**
 * Conversation sidebar: one row per thread (other user + listing).
 */
export default function MessageList({ conversations, isSelected, onSelect }) {
  return (
    <ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto text-sm">
      {conversations.length === 0 && <li className="text-clay-muted">No threads yet.</li>}
      {conversations.map((c, i) => {
        const sel = isSelected(c);
        const listingId = c.lostItem?.publicId || c.foundItem?.publicId || '—';
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left shadow-sm transition duration-200 ${
                sel
                  ? 'border-clay-primary/40 bg-clay-lilac shadow-clay'
                  : 'border-clay-border/80 bg-clay-surface hover:border-clay-primary/25 hover:shadow-clay'
              }`}
            >
              <span className="font-medium text-clay-ink">{c.otherUser.name}</span>
              {c.unread > 0 && (
                <span className="ml-2 rounded-full bg-clay-mint px-2 py-0.5 text-xs font-medium text-accent-700">
                  {c.unread} new
                </span>
              )}
              <p className="truncate text-xs text-clay-muted">
                {listingId} · {c.lastMessage?.text}
              </p>
              {(c.otherUser.sharedEmail || c.otherUser.sharedPhone) && (
                <p className="mt-1 text-xs text-accent-600">
                  {c.otherUser.sharedEmail}
                  {c.otherUser.sharedPhone && ` · ${c.otherUser.sharedPhone}`}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
