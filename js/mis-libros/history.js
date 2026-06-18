// js/mis-libros/history.js

export function loadHistory() {
    const history = JSON.parse(localStorage.getItem('bookHistory') || '[]');
    const historyGrid = document.getElementById('history-grid');
    
    if (!historyGrid) return;
    
    if (history.length === 0) {
        historyGrid.innerHTML = '<p style="text-align: center; color: #666;">Aún no has visto ningún libro</p>';
        return;
    }
    
    historyGrid.innerHTML = '';
    history.slice(0, 5).forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.onclick = () => window.location.href = `book.html?id=${book.id}`;
        card.innerHTML = `
            <img src="assets/default-cover.jpg" alt="${book.title}" class="book-cover">
            <div class="book-info">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <small>Visto: ${new Date(book.viewedAt).toLocaleDateString()}</small>
            </div>
        `;
        historyGrid.appendChild(card);
    });
}