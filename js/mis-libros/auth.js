// js/mis-libros/auth.js

export function checkAuth() {
    const user = localStorage.getItem('user');
    const isGuest = localStorage.getItem('guest');
    
    if (!user || isGuest === 'true') {
        window.location.href = 'login.html';
        return null;
    }
    
    try {
        return JSON.parse(user);
    } catch {
        return { email: 'Usuario' };
    }
}

export function displayUserInfo(userData) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            <span class="user-email">👤 ${userData.email || userData.name || 'Usuario'}</span>
            <span style="color: #666;">Sesión iniciada</span>
        `;
    }
}

export function setupLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('guest');
        window.location.href = 'index.html';
    });
}