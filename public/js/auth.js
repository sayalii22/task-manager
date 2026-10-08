/**
 * Authentication Client Logic (Login & Registration)
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (window.Auth && window.Auth.isAuthenticated()) {
    window.location.href = '/dashboard';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const demoLoginBtn = document.getElementById('demoLoginBtn');

  // 1. Login Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

        const res = await window.API.auth.login({ email, password });
        window.Auth.setToken(res.token);
        window.Auth.setUser(res.user);
        showToast('Welcome back, ' + res.user.name + '!', 'success');

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right"></i>';
      }
    });
  }

  // 2. Register Handler
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!name || !email || !password) {
        showToast('Please fill out all required fields.', 'error');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

        const res = await window.API.auth.register({
          name,
          email,
          password,
          confirmPassword,
        });

        window.Auth.setToken(res.token);
        window.Auth.setUser(res.user);
        showToast('Account created successfully!', 'success');

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';
      }
    });
  }

  // 3. Demo Account 1-Click Login (Great for quick evaluator demo)
  if (demoLoginBtn) {
    demoLoginBtn.addEventListener('click', async () => {
      const demoEmail = 'alex.dev@example.com';
      const demoPass = 'Password123!';

      // Fill inputs visually
      const emailInput = document.getElementById('email');
      const passInput = document.getElementById('password');
      if (emailInput && passInput) {
        emailInput.value = demoEmail;
        passInput.value = demoPass;
      }

      demoLoginBtn.disabled = true;
      demoLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing Demo...';

      try {
        // Try login first
        try {
          const res = await window.API.auth.login({ email: demoEmail, password: demoPass });
          window.Auth.setToken(res.token);
          window.Auth.setUser(res.user);
          showToast('Welcome to the Demo Account!', 'success');
          setTimeout(() => { window.location.href = '/dashboard'; }, 500);
          return;
        } catch (loginErr) {
          // If demo user does not exist yet, register it automatically!
          const regRes = await window.API.auth.register({
            name: 'Alex Johnson',
            email: demoEmail,
            password: demoPass,
            confirmPassword: demoPass,
          });
          window.Auth.setToken(regRes.token);
          window.Auth.setUser(regRes.user);

          // Seed a few rich demo tasks
          await seedDemoTasks();

          showToast('Demo account ready!', 'success');
          setTimeout(() => { window.location.href = '/dashboard'; }, 500);
        }
      } catch (err) {
        showToast('Could not initialize demo: ' + err.message, 'error');
        demoLoginBtn.disabled = false;
        demoLoginBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Explore Demo Account (1-Click)';
      }
    });
  }
});

// Seed sample tasks so the demo account looks vibrant immediately
async function seedDemoTasks() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 5);

  const sampleTasks = [
    {
      title: 'Complete REST API documentation & Swagger specs',
      description: 'Review all endpoints, write response status codes, and test endpoints.',
      status: 'in-progress',
      priority: 'urgent',
      category: 'Work',
      tags: ['backend', 'api', 'docs'],
      dueDate: today.toISOString(),
    },
    {
      title: 'Implement Kanban Drag-and-Drop Board',
      description: 'Use HTML5 drag API to allow dragging tasks between columns and persist state.',
      status: 'completed',
      priority: 'high',
      category: 'Work',
      tags: ['frontend', 'ui'],
      dueDate: today.toISOString(),
    },
    {
      title: 'Study Node.js Streams & Event Loop Architecture',
      description: 'Prepare notes for upcoming interview technical assessment on Node core.',
      status: 'todo',
      priority: 'medium',
      category: 'Study',
      tags: ['nodejs', 'interview'],
      dueDate: tomorrow.toISOString(),
    },
    {
      title: 'Weekly grocery shopping for fresh produce',
      description: 'Avocados, spinach, almond milk, coffee beans, and sourdough bread.',
      status: 'todo',
      priority: 'low',
      category: 'Shopping',
      tags: ['home', 'groceries'],
      dueDate: nextWeek.toISOString(),
    },
    {
      title: 'Morning 5K Jog & Stretching routine',
      description: 'Track cadence with smartwatch and stay hydrated.',
      status: 'completed',
      priority: 'medium',
      category: 'Health',
      tags: ['cardio', 'fitness'],
      dueDate: today.toISOString(),
    }
  ];

  for (const t of sampleTasks) {
    try {
      await window.API.tasks.create(t);
    } catch (e) {
      // ignore seed errors
    }
  }
}
