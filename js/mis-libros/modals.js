// js/mis-libros/modals.js

import { showMessage } from './utils.js';
import { handleUpdate } from './books.js';

export async function openEditModal(bookId) {
    try {
        const response = await fetch(`https://biblionsoftware.onrender.com/api/book/${bookId}`);
        const book = await response.json();
        
        document.getElementById('edit-book-id').value = bookId;
        document.getElementById('edit-title').value = book.title || '';
        document.getElementById('edit-author').value = book.author || '';
        document.getElementById('edit-category').value = book.categoria || 'novela';
        document.getElementById('edit-estado').value = book.estado || 'disponible';
        
        document.getElementById('edit-modal').classList.add('active');
    } catch (error) {
        showMessage('Error al cargar el libro', 'error');
    }
}

export function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

export function setupEditForm() {
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const bookId = document.getElementById('edit-book-id').value;
        const bookData = {
            id: bookId,
            title: document.getElementById('edit-title').value,
            author: document.getElementById('edit-author').value,
            categoria: document.getElementById('edit-category').value,
            estado: document.getElementById('edit-estado').value
        };

        await handleUpdate(bookId, bookData);
    });
}

// Hacer global para los onclick
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;