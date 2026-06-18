// js/mis-libros/search.js

let searchTimeout;

export function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch('https://biblionsoftware.onrender.com/api/book');
                const books = await response.json();
                const filtered = books.filter(book => 
                    book.title?.toLowerCase().includes(query.toLowerCase()) ||
                    book.author?.toLowerCase().includes(query.toLowerCase())
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
                console.error('Error:', error);
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}