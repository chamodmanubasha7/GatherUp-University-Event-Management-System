/**
 * Single message in a lost/found thread (with optional edit/delete for sender).
 */
export default function ConversationMessage({ message: m, isMine, onEdit, onDelete }) {
  const deleted = Boolean(m.deletedAt || m.redacted);
  const edited = Boolean(m.editedAt) && !deleted;

  return (
    <div
      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
        isMine
          ? 'ml-auto border border-msg-purple/30 bg-msg-purple text-white'
          : 'mr-auto border border-msg-lavender bg-msg-lavender text-msg-ink'
      }`}
    >
      {isMine && !deleted && (
        <div className="-mt-0.5 mb-1 flex justify-end gap-0.5">
          <button
            type="button"
            className="rounded-lg bg-white/20 p-1 text-xs text-white hover:bg-white/30"
            title="Edit"
            onClick={() => onEdit?.(m)}
          >
            ✎
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-500/35 p-1 text-xs text-white hover:bg-red-500/55"
            title="Delete"
            onClick={() => onDelete?.(m)}
          >
            🗑
          </button>
        </div>
      )}
      <p className={`text-[10px] uppercase tracking-wide ${isMine ? 'text-white/80' : 'text-msg-muted'}`}>
        {m.sender?.name}
      </p>
      {deleted ? (
        <p className={`italic ${isMine ? 'text-white/75' : 'text-msg-muted'}`}>This message was deleted</p>
      ) : (
        <p className="whitespace-pre-wrap">{m.text}</p>
      )}
      <p className={`mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-slate-500'}`}>
        {new Date(m.createdAt).toLocaleString()}
      </p>
      {edited && m.editedAt && (
        <p className={`text-[10px] ${isMine ? 'text-white/70' : 'text-slate-500'}`}>
          <span className={`font-medium ${isMine ? 'text-white/85' : 'text-msg-muted'}`}>Edited</span> at{' '}
          {new Date(m.editedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
