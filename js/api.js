// API client for Biblion backend
const API_BASE = 'http://localhost:4000/api';

const BiblionAPI = {
  // Get auth token from localStorage
  getToken() {
    return localStorage.getItem('auth_token');
  },

  // Set auth token in localStorage
  setToken(token) {
    localStorage.setItem('auth_token', token);
  },

  // Clear auth token
  clearToken() {
    localStorage.removeItem('auth_token');
  },

  // Get current user from localStorage
  getCurrentUser() {
    const user = localStorage.getItem('current_user');
    return user ? JSON.parse(user) : null;
  },

  // Set current user in localStorage
  setCurrentUser(user) {
    localStorage.setItem('current_user', JSON.stringify(user));
  },

  // Helper to make API calls with auth token
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // AUTH ENDPOINTS
  async registerUser(name, email, matricula, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, matricula, password })
    });
    
    if (data.token) {
      this.setToken(data.token);
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async loginUser(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      this.setToken(data.token);
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async getCurrentUserProfile() {
    return this.request('/auth/me', { method: 'GET' });
  },

  async logout() {
    this.clearToken();
    this.setCurrentUser(null);
  },

  // BOOKS ENDPOINTS
  async getAllBooks() {
    return this.request('/books', { method: 'GET' });
  },

  async getBookById(bookId) {
    return this.request(`/books/${bookId}`, { method: 'GET' });
  },

  async addBook(formData) {
    const token = this.getToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers,
      body: formData // FormData, don't set Content-Type
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Upload failed: ${response.status}`);
    }

    return await response.json();
  },

  async updateBook(bookId, formData) {
    const token = this.getToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/books/${bookId}`, {
      method: 'PUT',
      headers,
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Update failed: ${response.status}`);
    }

    return await response.json();
  },

  async deleteBook(bookId) {
    return this.request(`/books/${bookId}`, { method: 'DELETE' });
  },

  // Not async: these just build a URL string synchronously. They used to be
  // declared `async` for no reason, which meant every caller that used the
  // result directly (none of them awaited it) got a Promise object instead
  // of the string — e.g. `<img src="${getBookCover(id)}">` literally set
  // src to the text "[object Promise]" and silently failed to load.
  getBookCover(bookId) {
    return `${API_BASE}/books/${bookId}/cover`;
  },

  getBookPdf(bookId) {
    return `${API_BASE}/books/${bookId}/pdf`;
  },

  // PURCHASES ENDPOINTS
  async purchaseBook(bookId) {
    return this.request('/purchases', {
      method: 'POST',
      body: JSON.stringify({ bookId })
    });
  },

  async getUserPurchases(userId) {
    return this.request(`/purchases/user/${userId}`, { method: 'GET' });
  },

  async getAllPurchases() {
    return this.request('/purchases', { method: 'GET' });
  },

  // RENTALS ENDPOINTS
  async rentBook(bookId, daysToRent) {
    return this.request('/rentals', {
      method: 'POST',
      body: JSON.stringify({ bookId, daysToRent })
    });
  },

  async getUserRentals(userId) {
    return this.request(`/rentals/user/${userId}`, { method: 'GET' });
  },

  async getAllRentals() {
    return this.request('/rentals', { method: 'GET' });
  },

  // ADMIN ENDPOINTS
  isAdmin() {
    const user = this.getCurrentUser();
    return !!user && user.role === 'admin';
  },

  async getAdminStats() {
    return this.request('/admin/stats', { method: 'GET' });
  },

  async getDbStatus() {
    return this.request('/admin/db-status', { method: 'GET' });
  },

  async getAdminUsers() {
    return this.request('/admin/users', { method: 'GET' });
  },

  async deleteUserAdmin(userId) {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }
};

// Make API available globally
window.BiblionAPI = BiblionAPI;
