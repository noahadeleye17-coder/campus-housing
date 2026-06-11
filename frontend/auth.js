const API_URL = "/api/auth";

/* REGISTER */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });

      const ct = res.headers.get('content-type') || '';
      let data;
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server responded with status ${res.status}`);
      }

      if (!res.ok) {
        alert(data.message || 'Registration failed');
        return;
      }

      alert(data.message || "Registered");
    } catch (err) {
      alert(err.message || 'Registration failed');
    }
  });
}

/* LOGIN */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const ct = res.headers.get('content-type') || '';
      let data;
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server responded with status ${res.status}`);
      }

      if (data && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "landlord") {
          window.location.href = "dashboard.html";
        } else {
          window.location.href = "index.html";
        }
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert(err.message || 'Login failed');
    }
  });
}
