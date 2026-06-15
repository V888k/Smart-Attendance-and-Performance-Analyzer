// ====== Login Page ======
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const role = document.getElementById('role').value;
        const errorEl = document.getElementById('loginError');

        if (!username || !password || !role) {
            errorEl.textContent = 'Please fill in all fields.';
            return;
        }

        try {
            const user = DataStore.authenticate(username, password, role);

            if (user) {
                localStorage.setItem('sarpa_current_user', JSON.stringify(user));
                window.location.href = 'dashboard.html';
            } else {
                errorEl.textContent = 'Invalid credentials. Please try again.';
            }
        } catch (err) {
            errorEl.textContent = 'Login error. Check console for details.';
            console.error('Login error:', err);
        }
    });
});
