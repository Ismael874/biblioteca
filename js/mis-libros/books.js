// js/mis-libros/books.js

import { showMessage } from './utils.js';
import { openEditModal } from './modals.js';

export async function loadUserBooks() {
    try {
        const response = await fetch('https://biblionsoftware.onrender.com/api/book');
        const books = await response.json();
        displayBooksTable(books);
    } catch (error) {
        console.error('Error cargando libros:', error);
        document.getElementById('books-list').innerHTML = `
            <div class="empty-state">
                <p>Error al cargar los libros</p>
            </div>
        `;
    }
}

function displayBooksTable(books) {
    const container = document.getElementById('books-list');
    
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
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    books.forEach(book => {
        html += `
            <tr>
                <td>${book.title || 'Sin título'}</td>
                <td>${book.author || 'Sin autor'}</td>
                <td>${book.categoria || 'Sin categoría'}</td>
                <td>${book.estado || 'disponible'}</td>
                <td>
                    <div class="action-buttons">
                        <a href="book.html?id=${book.id}" class="btn-view">Ver</a>
                        <button onclick="window.openEditModal('${book.id}')" class="btn-edit">Editar</button>
                        <button onclick="window.confirmDelete('${book.id}')" class="btn-delete">Eliminar</button>
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
}

export async function handleDelete(bookId) {
    try {
        const response = await fetch(`https://biblionsoftware.onrender.com/api/book/${bookId}`, {
            method: 'DELETE'
        });

        const data = await response.text();
        
        if (response.ok) {
            showMessage('Libro eliminado correctamente', 'success');
            loadUserBooks();
        } else {
            showMessage('Error al eliminar el libro', 'error');
        }
    } catch (error) {
        console.error('Error en eliminación:', error);
        showMessage('Error de conexión', 'error');
    }
}

export async function handleUpdate(bookId, bookData) {
    try {
        const response = await fetch(`https://biblionsoftware.onrender.com/api/book/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookData)
        });

        const data = await response.text();
        
        if (response.ok) {
            showMessage('Libro actualizado correctamente', 'success');
            window.closeEditModal();
            loadUserBooks();
        } else {
            showMessage('Error al actualizar el libro', 'error');
        }
    } catch (error) {
        console.error('Error en actualización:', error);
        showMessage('Error de conexión', 'error');
    }
}

// Hacer funciones globales para los onclick
window.confirmDelete = (bookId) => {
    if (confirm('¿Estás seguro de que quieres eliminar este libro?')) {
        handleDelete(bookId);
    }
};