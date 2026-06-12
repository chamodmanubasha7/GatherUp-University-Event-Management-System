import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Let axios set `multipart/form-data` + boundary for FormData (default JSON Content-Type breaks uploads). */
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    if (status === 401) {
      // Return a special error that we can catch silently
      return Promise.reject({ silent: true, status: 401 });
    }
    const msg =
      err.response?.data?.message ||
      err.response?.data?.errors?.map((e) => e.msg).join(', ') ||
      err.message;
    return Promise.reject(new Error(msg));
  }
);

export default api;
