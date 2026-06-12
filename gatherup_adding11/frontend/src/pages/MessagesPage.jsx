import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import MessageForm from '../components/MessageForm.jsx';
import MessageList from '../components/MessageList.jsx';
import ConversationMessage from '../components/ConversationMessage.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editModal, setEditModal] = useState(null); // { id, text }
  const [editBusy, setEditBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id }
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConvOpen, setDeleteConvOpen] = useState(false);
  const [deleteConvBusy, setDeleteConvBusy] = useState(false);

  const lostId = searchParams.get('lost');
  const foundId = searchParams.get('found');
  const withUserId = searchParams.get('with');

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/lost-found/conversations');
    setConversations(data.conversations || []);
  }, []);

  const loadThread = useCallback(async () => {
    if (!withUserId) {
      setMessages([]);
      return;
    }
    const params = new URLSearchParams({ withUserId });
    if (lostId) params.set('lostItemId', lostId);
    if (foundId) params.set('foundItemId', foundId);
    const { data } = await api.get(`/lost-found/messages?${params.toString()}`);
    setMessages(data);
  }, [withUserId, lostId, foundId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadConversations();
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadConversations]);

  useEffect(() => {
    if (!withUserId || lostId || foundId || !conversations.length) return;
    const match = conversations.find((c) => String(c.otherUser.id) === String(withUserId));
    if (match?.lostItem?._id) {
      const p = new URLSearchParams(searchParams);
      p.set('lost', String(match.lostItem._id));
      setSearchParams(p, { replace: true });
    } else if (match?.foundItem?._id) {
      const p = new URLSearchParams(searchParams);
      p.set('found', String(match.foundItem._id));
      setSearchParams(p, { replace: true });
    }
  }, [withUserId, lostId, foundId, conversations, searchParams, setSearchParams]);

  useEffect(() => {
    (async () => {
      try {
        await loadThread();
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [loadThread]);

  async function sendReply(e) {
    e.preventDefault();
    if (!text.trim() || !withUserId) return;
    if (!lostId && !foundId) {
      toast.error('Select a conversation');
      return;
    }
    setSending(true);
    try {
      await api.post('/lost-found/messages', {
        recipientId: withUserId,
        text: text.trim(),
        ...(lostId ? { lostItemId: lostId } : { foundItemId: foundId }),
      });
      setText('');
      toast.success('Sent');
      await Promise.all([loadThread(), loadConversations()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editModal?.text?.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    setEditBusy(true);
    try {
      await api.put(`/messages/${editModal.id}`, { text: editModal.text.trim() });
      toast.success('Message updated');
      setEditModal(null);
      await Promise.all([loadThread(), loadConversations()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/messages/${deleteTarget.id}`);
      toast.success('Message deleted');
      setDeleteTarget(null);
      await Promise.all([loadThread(), loadConversations()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function confirmDeleteConversation() {
    if (!withUserId) return;
    setDeleteConvBusy(true);
    try {
      if (lostId) {
        await api.delete(`/messages/conversation/${withUserId}/${lostId}?itemType=lost`);
      } else if (foundId) {
        await api.delete(`/messages/conversation/${withUserId}/${foundId}?itemType=found`);
      } else {
        await api.delete(`/messages/conversation/${withUserId}`);
      }
      toast.success('Conversation removed from your inbox');
      setDeleteConvOpen(false);
      await Promise.all([loadThread(), loadConversations()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteConvBusy(false);
    }
  }

  function openConv(c) {
    const params = new URLSearchParams();
    params.set('with', String(c.otherUser.id));
    if (c.lostItem?._id) params.set('lost', String(c.lostItem._id));
    if (c.foundItem?._id) params.set('found', String(c.foundItem._id));
    setSearchParams(params);
  }

  const active = conversations.find(
    (c) =>
      String(c.otherUser.id) === String(withUserId || '') &&
      (!lostId || String(c.lostItem?._id) === String(lostId)) &&
      (!foundId || String(c.foundItem?._id) === String(foundId))
  );

  if (loading) {
    return <div className="py-20 text-center text-clay-muted">Loading messages…</div>;
  }

  const myId = user?.id ? String(user.id) : '';

  const isSelected = (c) =>
    String(c.otherUser.id) === String(withUserId || '') &&
    (!lostId || String(c.lostItem?._id) === String(lostId)) &&
    (!foundId || String(c.foundItem?._id) === String(foundId));

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {editModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-clay-ink/25 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 shadow-clay-lg">
            <h2 className="font-display text-lg font-bold text-clay-ink">Edit message</h2>
            <form onSubmit={saveEdit} className="mt-4 space-y-3">
              <textarea
                className="input-field min-h-[120px]"
                maxLength={4000}
                value={editModal.text}
                onChange={(e) => setEditModal({ ...editModal, text: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setEditModal(null)} disabled={editBusy}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={editBusy}>
                  {editBusy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete message?"
          description="This removes the message for everyone in the thread. You can’t undo this."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          busy={deleteBusy}
          onCancel={() => !deleteBusy && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {deleteConvOpen && (
        <ConfirmModal
          title="Delete conversation?"
          description="Hides this thread from your view only. The other person still has their messages. You can start a new thread from a listing if needed."
          confirmLabel="Delete for me"
          cancelLabel="Cancel"
          danger
          busy={deleteConvBusy}
          onCancel={() => !deleteConvBusy && setDeleteConvOpen(false)}
          onConfirm={confirmDeleteConversation}
        />
      )}

      <aside className="glass-card p-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-xl font-bold text-clay-ink">Messages</h1>
          <Link to="/dashboard" className="text-xs font-medium text-clay-primary hover:underline">
            Dashboard
          </Link>
        </div>
        <p className="mt-1 text-xs text-clay-muted">Coordinate lost &amp; found with other users.</p>
        <MessageList conversations={conversations} isSelected={isSelected} onSelect={openConv} />
        <Link
          to="/dashboard/profile"
          className="btn-secondary mt-4 inline-flex w-full justify-center !py-2 !text-xs"
        >
          Contact sharing settings
        </Link>
      </aside>

      <section className="glass-card flex min-h-[420px] flex-col p-4 lg:col-span-3">
        {!withUserId ? (
          <p className="text-clay-muted">Select a conversation or open a link from your notifications.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-clay-border pb-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-clay-ink">
                  {active?.otherUser?.name || 'Conversation'}
                </h2>
                <p className="text-xs text-clay-muted">
                  {lostId && `Lost: ${active?.lostItem?.publicId || ''}`}
                  {foundId && `Found: ${active?.foundItem?.publicId || ''}`}
                  {!lostId && !foundId && 'All messages with this person'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-2xl border-2 border-clay-border bg-clay-surface p-2 text-clay-muted shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Delete conversation for you"
                disabled={messages.length === 0}
                aria-label="Delete conversation"
                onClick={() => setDeleteConvOpen(true)}
              >
                <span aria-hidden="true">🗑</span>
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-clay-border/80 bg-clay-mist/50 p-3 shadow-inner">
              {messages.map((m) => {
                const mine = myId && String(m.sender?._id ?? m.sender) === myId;
                return (
                  <ConversationMessage
                    key={m._id}
                    message={m}
                    isMine={mine}
                    onEdit={(msg) => setEditModal({ id: msg._id, text: msg.text || '' })}
                    onDelete={(msg) => setDeleteTarget({ id: msg._id })}
                  />
                );
              })}
              {messages.length === 0 && (
                <p className="text-center text-clay-muted">
                  No messages{lostId || foundId ? ' yet' : ' — conversation cleared or empty'}.
                </p>
              )}
            </div>
            <MessageForm
              className="mt-3 border-t border-clay-border pt-3"
              value={text}
              onChange={setText}
              onSubmit={sendReply}
              sending={sending}
              disabled={!lostId && !foundId}
              placeholder={
                lostId || foundId ? 'Type a reply…' : 'Open a listing thread from the sidebar to reply…'
              }
            />
          </>
        )}
      </section>
    </div>
  );
}
