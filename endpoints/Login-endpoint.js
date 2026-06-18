// endpoints/Login-endpoint.js

// Limpiar guest al cargar login
localStorage.removeItem('guest');

const loginForm = document.getElementById('login-form');

// Verificar que el formulario existe
if (!loginForm) {
    console.error('❌ ERROR: No se encontró el formulario con id="login-form"');
} else {
    loginForm.addEventListener("submit", async(e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Iniciando sesión...';
        submitBtn.disabled = true;

        try {
            console.log('📡 Enviando login para:', email);
            
            const response = await fetch('https://biblionsoftware.onrender.com/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.text();
            console.log('📡 Respuesta del servidor:', data);

            if (response.ok) {
                // Guardar información del usuario
                localStorage.setItem('user', JSON.stringify({ 
                    email: email,
                    name: email.split('@')[0] 
                }));
                localStorage.setItem('token', 'logged-in'); // Token dummy
                localStorage.removeItem('guest');
                
                alert('✅ Inicio de sesión exitoso');
                window.location.href = "mis-libros.html";
            } else {
                alert('❌ Error: ' + data);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión. Intenta de nuevo.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}