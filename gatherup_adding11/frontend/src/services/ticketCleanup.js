import api from './api.js';

/** Admin: delete all used tickets and tickets for ended events (+ linked registrations). */
export async function adminCleanupTickets() {
  const { data } = await api.delete('/tickets/cleanup');
  return data;
}

/** Current user: delete tickets where the event has ended (+ registrations). */
export async function deleteMyExpiredTickets() {
  const { data } = await api.delete('/tickets/mine/expired');
  return data;
}

/** Current user: delete one ticket if its event has ended. */
export async function deleteMyExpiredTicket(ticketId) {
  const { data } = await api.delete(`/tickets/mine/${ticketId}`);
  return data;
}
