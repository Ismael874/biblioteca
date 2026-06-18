// js/mis-libros.js

import { checkAuth, displayUserInfo, setupLogout } from './mis-libros/auth.js';
import { loadUserBooks } from './mis-libros/books.js';
import { loadHistory } from './mis-libros/history.js';
import { setupSearch } from './mis-libros/search.js';
import { setupEditForm } from './mis-libros/modals.js';

// Inicializar todo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const userData = checkAuth();
    if (userData) {
        displayUserInfo(userData);
    }

    // Configurar logout
    setupLogout();

    // Cargar datos
    loadUserBooks();
    loadHistory();

    // Configurar funcionalidades
    setupSearch();
    setupEditForm();
});