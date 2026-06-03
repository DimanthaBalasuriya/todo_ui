import axios from 'axios';

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://todoapi-production-459b.up.railway.app/api';

const RAW_ASSET_BASE =
  import.meta.env.VITE_STORAGE_BASE_URL ||
  import.meta.env.VITE_R2_PUBLIC_URL ||
  import.meta.env.VITE_PUBLIC_ASSET_URL ||
  '';

function trimSlashes(value) {
  return String(value || '').replace(/\/+$/g, '').replace(/^\/+/g, '');
}

function getApiBaseUrl() {
  return trimSlashes(RAW_API_BASE);
}

function getPublicBaseUrl() {
  const apiBase = getApiBaseUrl();
  return trimSlashes(RAW_ASSET_BASE || apiBase.replace(/\/api$/i, ''));
}

function joinUrl(base, path) {
  const cleanBase = trimSlashes(base);
  const cleanPath = trimSlashes(path);

  if (!cleanBase) return `/${cleanPath}`;
  if (!cleanPath) return cleanBase;
  return `${cleanBase}/${cleanPath}`;
}

function normalizeImagePath(value) {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  if (/^(blob:|data:|https?:\/\/)/i.test(raw)) return raw;

  const normalized = raw
    .replace(/^\/+/, '')
    .replace(/^storage\/+/, '')
    .replace(/\/{2,}/g, '/');

  const publicBase = trimSlashes(RAW_ASSET_BASE);

  if (publicBase) {
    return joinUrl(publicBase, normalized);
  }

  return joinUrl(getPublicBaseUrl(), `storage/${normalized}`);
}

/* =========================================================
   🔥 FIX: Proper FormData builder (DO NOT DROP FILES)
========================================================= */
function toFormData(payload) {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    // 🔥 FIX: handle image correctly
    if (key === 'image') {
      if (value instanceof File) {
        formData.append('image', value);
      }
      return;
    }

    formData.append(key, value);
  });

  return formData;
}

function hasFileValue(payload) {
  return payload && payload.image instanceof File;
}

function buildRequestBody(payload) {
  if (!payload) return payload;
  if (payload instanceof FormData) return payload;
  if (hasFileValue(payload)) return toFormData(payload);
  return payload;
}

/* ========================================================= */

const client = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: 'application/json',
  },
});

let token = '';

function setToken(nextToken) {
  token = nextToken || '';

  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

function clearToken() {
  setToken('');
}

/* =========================================================
   🔥 FIX: Central request handler (FILE SAFE)
========================================================= */
async function request(method, url, payload = undefined, config = {}) {
  const body = buildRequestBody(payload);
  const headers = { ...(config.headers || {}) };

  // IMPORTANT: let browser set boundary for FormData
  if (body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await client.request({
    method,
    url,
    data: body,
    ...config,
    headers,
  });

  return response.data;
}

function get(url, config) {
  return request('get', url, undefined, config);
}

function post(url, payload, config) {
  return request('post', url, payload, config);
}

/* =========================================================
   ❌ FIX: DO NOT USE PUT FOR FILE UPLOADS
   We replace it with POST + _method override
========================================================= */
function put(url, payload, config) {
  if (payload instanceof FormData) {
    payload.append('_method', 'PUT');
    return post(url, payload, config);
  }

  return request('put', url, payload, config);
}

function patch(url, payload, config) {
  if (payload instanceof FormData) {
    payload.append('_method', 'PATCH');
    return post(url, payload, config);
  }

  return request('patch', url, payload, config);
}

function destroy(url, config) {
  return request('delete', url, undefined, config);
}

/* ========================================================= */

const api = {
  setToken,
  clearToken,
  imageUrl: normalizeImagePath,

  login: (credentials) => post('/login', credentials),
  register: (payload) => post('/register', payload),
  logout: () => post('/logout'),
  me: () => get('/profile'),

  listTodos: () => get('/todos'),
  listTrash: () => get('/todos/trash'),

  // Admin endpoints
  listUsers: async () => {
    // Try admin endpoint first, fallback to general users endpoint if not available
    try {
      return await get('/admin/users');
    } catch (err) {
      // if admin endpoint fails (403/404), try /users
      try {
        return await get('/users');
      } catch (err2) {
        // rethrow original error to surface to caller
        throw err;
      }
    }
  },
  listUserTodos: (userId) =>
    get('/admin/todos').then((resp) => {
      const items = resp?.data ?? resp?.todos ?? resp?.items ?? resp ?? [];
      const list = Array.isArray(items) ? items : [];
      const filtered = list.filter((t) => String(t.user_id) === String(userId));

      return { ...(resp || {}), data: filtered };
    }),

  createTodo: (payload) => post('/todos', payload),

  /* 🔥 FIXED HERE */
  updateTodo: (id, payload) => put(`/todos/${id}`, payload),

  deleteTodo: (id) => destroy(`/todos/${id}`),
  restoreTodo: (id) => post(`/todos/${id}/restore`),
  forceDeleteTodo: (id) => destroy(`/todos/${id}/force`),
  // Delete a user (try admin endpoint first, fallback to general users endpoint)
  deleteUser: async (id) => {
    try {
      return await destroy(`/admin/users/${id}`);
    } catch (err) {
      try {
        return await destroy(`/users/${id}`);
      } catch (err2) {
        throw err;
      }
    }
  },
};

export default api;