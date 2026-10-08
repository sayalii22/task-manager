const http = require('http');

// Simple test suite
async function runTests() {
  console.log('🧪 Starting API Verification Tests...\n');

  // Start the server in-process
  process.env.PORT = '5055';
  process.env.NODE_ENV = 'test';
  const app = require('./server.js');

  const BASE = 'http://localhost:5055';

  function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  // Delay for server to bind
  await new Promise(r => setTimeout(r, 1200));

  try {
    // 1. Health check
    console.log('1. Testing GET /api/health');
    const health = await request('GET', '/api/health');
    console.log('   Status:', health.status, 'DB Mode:', health.body.database);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Register
    console.log('\n2. Testing POST /api/auth/register');
    const regPayload = {
      name: 'Sarah Connor',
      email: `sarah_${Date.now()}@test.com`,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    };
    const regRes = await request('POST', '/api/auth/register', regPayload);
    console.log('   Status:', regRes.status, 'Success:', regRes.body.success, 'Token:', Boolean(regRes.body.token));
    if (regRes.status !== 201 || !regRes.body.token) throw new Error('Registration failed');
    const token = regRes.body.token;

    // 3. Login
    console.log('\n3. Testing POST /api/auth/login');
    const loginRes = await request('POST', '/api/auth/login', {
      email: regPayload.email,
      password: regPayload.password
    });
    console.log('   Status:', loginRes.status, 'Logged in:', loginRes.body.user.name);
    if (loginRes.status !== 200) throw new Error('Login failed');

    // 4. Get Current User Me
    console.log('\n4. Testing GET /api/auth/me');
    const meRes = await request('GET', '/api/auth/me', null, token);
    console.log('   Status:', meRes.status, 'User ID:', meRes.body.user.id);
    if (meRes.status !== 200) throw new Error('Get Me failed');

    // 5. Create Task
    console.log('\n5. Testing POST /api/tasks (Create Task)');
    const taskPayload = {
      title: 'Deploy microservices to Kubernetes',
      description: 'Setup cluster and configure ingress controllers',
      priority: 'urgent',
      status: 'in-progress',
      category: 'Work',
      tags: ['devops', 'k8s', 'cloud'],
      dueDate: new Date(Date.now() + 86400000).toISOString()
    };
    const taskRes = await request('POST', '/api/tasks', taskPayload, token);
    console.log('   Status:', taskRes.status, 'Created Task ID:', taskRes.body.task._id);
    if (taskRes.status !== 201) throw new Error('Create task failed');
    const taskId = taskRes.body.task._id;

    // 6. Create Second Task
    console.log('\n6. Creating second task...');
    const task2 = await request('POST', '/api/tasks', {
      title: 'Review Supabase PostgreSQL indexes',
      priority: 'high',
      status: 'todo',
      category: 'Study',
      tags: ['database']
    }, token);
    const task2Id = task2.body.task._id;

    // 7. Get Tasks (Filtering & Search)
    console.log('\n7. Testing GET /api/tasks?search=kubernetes');
    const searchRes = await request('GET', '/api/tasks?search=kubernetes', null, token);
    console.log('   Status:', searchRes.status, 'Found count:', searchRes.body.count);
    if (searchRes.body.count !== 1) throw new Error('Search did not match expected count');

    // 8. Patch Task Status
    console.log('\n8. Testing PATCH /api/tasks/:id/status');
    const patchRes = await request('PATCH', `/api/tasks/${taskId}/status`, { status: 'completed' }, token);
    console.log('   Status:', patchRes.status, 'New status:', patchRes.body.task.status);
    if (patchRes.body.task.status !== 'completed') throw new Error('Status patch failed');

    // 9. Get Stats
    console.log('\n9. Testing GET /api/tasks/stats');
    const statsRes = await request('GET', '/api/tasks/stats', null, token);
    console.log('   Status:', statsRes.status, 'Total:', statsRes.body.stats.total, 'Completed:', statsRes.body.stats.completed, 'Completion Rate:', statsRes.body.stats.completionRate + '%');
    if (statsRes.body.stats.total !== 2 || statsRes.body.stats.completed !== 1) throw new Error('Stats incorrect');

    // 10. Bulk Status Update
    console.log('\n10. Testing POST /api/tasks/bulk (status)');
    const bulkRes = await request('POST', '/api/tasks/bulk', {
      action: 'status',
      ids: [taskId, task2Id],
      value: 'completed'
    }, token);
    console.log('   Status:', bulkRes.status, 'Message:', bulkRes.body.message);
    if (bulkRes.status !== 200) throw new Error('Bulk update failed');

    // 11. Export Tasks (CSV and JSON)
    console.log('\n11. Testing GET /api/tasks/export?format=csv');
    const csvRes = await request('GET', '/api/tasks/export?format=csv', null, token);
    console.log('   Status:', csvRes.status, 'Content type:', csvRes.headers['content-type']);
    if (csvRes.status !== 200 || !csvRes.body.includes('Deploy microservices')) throw new Error('CSV export failed');

    // 12. Delete Task
    console.log('\n12. Testing DELETE /api/tasks/:id');
    const delRes = await request('DELETE', `/api/tasks/${taskId}`, null, token);
    console.log('   Status:', delRes.status, 'Message:', delRes.body.message);
    if (delRes.status !== 200) throw new Error('Delete task failed');

    console.log('\n🎉 ALL 12 API VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
