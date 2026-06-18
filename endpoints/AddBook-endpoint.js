// endpoints/AddBook-endpoint.js

const AddBookForm = document.getElementById('add-book-form');

AddBookForm.addEventListener("submit", async(e) =>{
    e.preventDefault();

    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const categoria = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const estado = document.getElementById('estado').value || 'disponible';

    // Validar campos obligatorios
    if (!title || !author || !categoria || !description) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }

    const submitBtn = AddBookForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Publicando...';
    submitBtn.disabled = true;

    try{
        const bookData = { 
            title, 
            author, 
            categoria,
            description,
            estado
        };
        
        console.log('📡 Enviando datos:', bookData);
        
        // SIN HEADER DE AUTORIZACIÓN
        const response = await fetch('https://biblionsoftware.onrender.com/api/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookData)
        });
        
        const responseText = await response.text();
        console.log('📡 Respuesta del servidor:', responseText);

        if (response.ok){
            alert("✅ Libro agregado exitosamente");
            window.location.href = "mis-libros.html";
        } else {
            alert("❌ Error al agregar el libro: " + responseText);
        }
    } catch (error) {
        console.error('Error al agregar libro:', error);  
        alert('Error de conexión. Intenta de nuevo.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});