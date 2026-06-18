// js/mis-libros/utils.js

export function showMessage(message, type) {
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