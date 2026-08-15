(function () {
  function showMessage(message, type) {
    const container = document.getElementById('message-container');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.textContent = message;
    container.innerHTML = '';
    container.appendChild(msgDiv);

    setTimeout(() => {
      msgDiv.remove();
    }, 3000);
  }

  function getCurrentUser() {
    return window.BiblionAPI?.getCurrentUser() || null;
  }

  function checkAuth() {
    const user = getCurrentUser();
    const token = window.BiblionAPI?.getToken();
    
    if (user && token) return user;

    window.location.href = 'login.html';
    return null;
  }

  function displayUserInfo(userData) {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) return;

    userInfo.innerHTML = `
      <span class="user-email">👤 ${userData.name || userData.email || 'Usuario'}</span>
      <span style="color: #666;">Sesión iniciada</span>
    `;
  }

  function setupLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      window.BiblionAPI?.logout();
      window.location.href = 'index.html';
    });
  }

  async function loadUserBooks() {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const books = await window.BiblionAPI.getAllBooks();
      const userBooks = books.filter(book => book.ownerId === user.id);
      displayBooksTable(userBooks);
    } catch (error) {
      console.error('Error loading books:', error);
      showMessage('Error al cargar los libros', 'error');
    }
  }

  function displayBooksTable(books) {
    const container = document.getElementById('books-list');
    if (!container) return;

    if (!books || books.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No tienes libros agregados aún</p>
          <a href="add-book.html" class="btn btn-primary">Agregar tu primer libro</a>
        </div>
      `;
      return;
    }

    let html = `
      <table class="books-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Autor</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    books.forEach(book => {
      const priceText = book.isFree ? 'Gratis' : '$' + book.price;
      html += `
        <tr>
          <td>${book.title || 'Sin título'}</td>
          <td>${book.author || 'Sin autor'}</td>
          <td>${book.categoria || 'Sin categoría'}</td>
          <td>${priceText}</td>
          <td>
            <div class="action-buttons">
              <a href="book.html?id=${book.id}" class="btn-view">Ver</a>
              <button class="btn-edit" data-book-id="${book.id}">Editar</button>
              <button class="btn-delete" data-book-id="${book.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
    setupDeleteButtons();
    setupEditButtons();
  }

  function setupDeleteButtons() {
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const bookId = btn.dataset.bookId;
        if (confirm('¿Estás seguro de que deseas eliminar este libro?')) {
          try {
            await window.BiblionAPI.deleteBook(bookId);
            showMessage('Libro eliminado correctamente', 'success');
            loadUserBooks();
          } catch (error) {
            showMessage('Error: ' + error.message, 'error');
          }
        }
      });
    });
  }

  function setupEditButtons() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openEditModal(btn.dataset.bookId);
      });
    });
  }

  async function openEditModal(bookId) {
    try {
      const book = await window.BiblionAPI.getBookById(bookId);
      document.getElementById('edit-book-id').value = bookId;
      document.getElementById('edit-title').value = book.title || '';
      document.getElementById('edit-author').value = book.author || '';
      document.getElementById('edit-category').value = book.categoria || 'novela';
      document.getElementById('edit-estado').value = book.estado || 'disponible';
      document.getElementById('edit-price').value = book.price || 0;
      document.getElementById('edit-is-free').checked = !!book.isFree;
      document.getElementById('edit-cover').value = '';
      document.getElementById('edit-pdf').value = '';
      document.getElementById('edit-modal').classList.add('active');
    } catch (error) {
      showMessage('Error al cargar el libro: ' + error.message, 'error');
    }
  }

  function closeEditModal() {
    document.getElementById('edit-modal')?.classList.remove('active');
  }

  function setupEditForm() {
    const editForm = document.getElementById('edit-form');
    if (!editForm) return;

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bookId = document.getElementById('edit-book-id').value;
      const coverFile = document.getElementById('edit-cover').files[0];
      const pdfFile = document.getElementById('edit-pdf').files[0];

      const formData = new FormData();
      formData.append('title', document.getElementById('edit-title').value);
      formData.append('author', document.getElementById('edit-author').value);
      formData.append('categoria', document.getElementById('edit-category').value);
      formData.append('estado', document.getElementById('edit-estado').value);
      formData.append('price', document.getElementById('edit-price').value || 0);
      formData.append('isFree', document.getElementById('edit-is-free').checked);
      if (coverFile) formData.append('cover', coverFile);
      if (pdfFile) formData.append('pdf', pdfFile);

      try {
        await window.BiblionAPI.updateBook(bookId, formData);
        showMessage('Libro actualizado correctamente', 'success');
        closeEditModal();
        loadUserBooks();
      } catch (error) {
        showMessage('Error: ' + error.message, 'error');
      }
    });
  }

  window.closeEditModal = closeEditModal;

  function loadHistory() {
    // History feature disabled with API (can be implemented with separate endpoint)
    const historyGrid = document.getElementById('history-grid');
    if (!historyGrid) return;
    historyGrid.innerHTML = '<p style="text-align: center; color: #666;">Historial no disponible</p>';
  }

  let searchTimeout;
  function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim().toLowerCase();
      clearTimeout(searchTimeout);
      if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const user = getCurrentUser();
          const books = await window.BiblionAPI.getAllBooks();
          const userBooks = books.filter(b => b.ownerId === user.id);
          const filtered = userBooks.filter(book =>
            book.title?.toLowerCase().includes(query) ||
            book.author?.toLowerCase().includes(query) ||
            book.categoria?.toLowerCase().includes(query)
          );

          if (filtered.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No se encontraron libros</div>';
          } else {
            searchResults.innerHTML = filtered.slice(0, 5).map(book => `
              <div class="search-result-item" onclick="window.location.href='book.html?id=${book.id}'">
                <h4>${book.title}</h4>
                <p>${book.author}</p>
              </div>
            `).join('');
          }
          searchResults.style.display = 'block';
        } catch (error) {
          console.error('Search error:', error);
        }
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const userData = checkAuth();
    if (userData) {
      displayUserInfo(userData);
      const adminNavLink = document.getElementById('admin-nav-link');
      if (adminNavLink && window.BiblionAPI.isAdmin()) {
        adminNavLink.style.display = '';
      }
    }
    setupLogout();
    loadUserBooks();
    loadHistory();
    setupSearch();
    setupEditForm();
  });
})();
