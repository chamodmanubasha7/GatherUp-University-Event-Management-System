import api from './api.js';

/** Paginated hidden lost + found (admin). */
export async function listHiddenLostFound(params = {}) {
  const { data } = await api.get('/lost-found/admin/hidden', { params });
  return data;
}

/** Hard-delete a hidden listing; `type` is `lost` or `found`. */
export async function adminDeleteHiddenListing(type, id) {
  const { data } = await api.delete(`/lost-found/admin/${type}/${id}`);
  return data;
}
