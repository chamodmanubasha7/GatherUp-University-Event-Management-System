export default function MessageForm({
  value,
  onChange,
  onSubmit,
  sending,
  disabled = false,
  placeholder = 'Type a message…',
  submitLabel = 'Send',
  className = '',
}) {
  function handleSubmit(e) {
    e.preventDefault();
    if (disabled) return;
    onSubmit?.(e);
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <input
        className="input-field flex-1 disabled:opacity-50"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        maxLength={4000}
        disabled={disabled || sending}
      />
      <button type="submit" className="btn-primary !px-4" disabled={disabled || sending}>
        {sending ? '…' : submitLabel}
      </button>
    </form>
  );
}
