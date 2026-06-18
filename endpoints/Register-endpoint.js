// endpoints/Register-endpoint.js

// Limpiar guest al cargar registro
localStorage.removeItem('guest');

const registerForm = document.getElementById('register-form');

if (!registerForm) {
    console.error('❌ ERROR: No se encontró el formulario con id="register-form"');
} else {
    registerForm.addEventListener("submit", async(e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const matricula = document.getElementById('matricula').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Registrando...';
        submitBtn.disabled = true;

        try {
            console.log('📡 Enviando registro para:', email);
            
            // 1. Registrar
            const registerResponse = await fetch('https://biblionsoftware.onrender.com/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, matricula, password })
            });

            const registerText = await registerResponse.text();
            console.log('📡 Registro response:', registerText);

            if (registerResponse.ok) {
                alert('✅ Registro exitoso! Iniciando sesión...');

                // 2. Login automático
                const loginResponse = await fetch('https://biblionsoftware.onrender.com/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const loginText = await loginResponse.text();
                console.log('📡 Login response:', loginText);

                if (loginResponse.ok) {
                    // Guardar información del usuario
                    localStorage.setItem('user', JSON.stringify({ 
                        name: name,
                        email: email,
                        matricula: matricula 
                    }));
                    localStorage.setItem('token', 'logged-in'); // Token dummy
                    localStorage.removeItem('guest');

                    alert('🎉 Bienvenido a Biblion');
                    window.location.href = "mis-libros.html";
                } else {
                    alert('⚠️ Registro exitoso, pero falló el auto-login. Por favor inicia sesión manualmente.');
                    window.location.href = "login.html";
                }
            } else {
                alert('❌ Error en el registro: ' + registerText);
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