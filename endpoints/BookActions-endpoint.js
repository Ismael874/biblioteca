// endpoints/BookActions-endpoint.js

// ============================================
// FUNCIONES PARA ACTUALIZAR Y ELIMINAR LIBROS
// ============================================

// Actualizar un libro (UPDATE)
export async function updateBook(bookId, bookData) {
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
            console.log("Libro actualizado:", data);
            return { success: true, message: "Libro actualizado correctamente" };
        } else {
            console.log("Error al actualizar:", data);
            return { success: false, message: "Error al actualizar el libro" };
        }
    } catch (error) {
        console.error('Error en actualización:', error);
        return { success: false, message: "Error de conexión" };
    }
}

// Eliminar un libro (DELETE)
export async function deleteBook(bookId) {
    try {
        const response = await fetch(`https://biblionsoftware.onrender.com/api/book/${bookId}`, {
            method: 'DELETE'
        });

        const data = await response.text();
        
        if (response.ok) {
            console.log("Libro eliminado:", data);
            return { success: true, message: "Libro eliminado correctamente" };
        } else {
            console.log("Error al eliminar:", data);
            return { success: false, message: "Error al eliminar el libro" };
        }
    } catch (error) {
        console.error('Error en eliminación:', error);
        return { success: false, message: "Error de conexión" };
    }
}