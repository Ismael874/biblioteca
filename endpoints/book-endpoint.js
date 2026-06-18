// endpoints/book-endpoint.js

async function getBooks() {
    try {
        const response = await fetch(`https://biblionsoftware.onrender.com/api/book`);
        const books = await response.json();

        console.log(books);

        const container = document.getElementById('book-detail-container');
        
        // Verificar si es la página de detalle o lista
        if (container && window.location.pathname.includes('book.html')) {
            // Es página de detalle - mostrar solo el primer libro? 
            // Esto está mal - necesitas obtener por ID
            console.warn('Este endpoint solo muestra el primer libro. Usa book.html?id=ID');
        }
    } catch (error) {
        console.error('Error fetching book details:', error);
    }
}

// Solo ejecutar si no hay parámetro ID
const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.has('id')) {
    getBooks();
}