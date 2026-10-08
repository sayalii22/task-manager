/**
 * Verification test for Supabase PostgreSQL Models, Query Builders, and Mappings
 */
const assert = require('assert');
const UserModel = require('./models/User');
const TaskModel = require('./models/Task');
const CategoryModel = require('./models/Category');
const { errorHandler } = require('./middleware/errorMiddleware');

async function runSupabaseUnitTests() {
  console.log('🧪 Starting Supabase Migration Unit & Integration Tests...\n');

  // Test 1: User Normalization & Methods
  console.log('1. Testing User model formatting & methods');
  const rawUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2a$10$hashedpasswordstring',
    avatar_color: '#3b82f6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const formattedUser = UserModel.formatUser(rawUser, false);
  assert.strictEqual(formattedUser.id, rawUser.id);
  assert.strictEqual(formattedUser._id, rawUser.id, 'Should provide both id and _id');
  assert.strictEqual(formattedUser.avatarColor, '#3b82f6');
  assert.strictEqual(formattedUser.password, undefined, 'Password should not be exposed by default');

  const withPass = UserModel.formatUser(rawUser, true);
  assert.strictEqual(withPass.password, rawUser.password);
  console.log('   ✅ User model normalization passed');

  // Test 2: Task Normalization & toDbTask Mapping
  console.log('\n2. Testing Task model normalization & toDbTask mapping');
  const rawTask = {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Migrate to Supabase',
    description: 'PostgreSQL schema and queries',
    status: 'in-progress',
    priority: 'urgent',
    category: 'Work',
    tags: ['supabase', 'postgres'],
    due_date: '2026-10-15T00:00:00.000Z',
    reminder_date: '2026-10-14T00:00:00.000Z',
    is_recurring: false,
    recurrence: 'none',
    completed_at: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  };

  const formattedTask = TaskModel.formatTask(rawTask);
  assert.strictEqual(formattedTask.id, rawTask.id);
  assert.strictEqual(formattedTask._id, rawTask.id);
  assert.strictEqual(formattedTask.user, rawTask.user_id);
  assert.strictEqual(formattedTask.dueDate, rawTask.due_date);
  assert.strictEqual(formattedTask.reminderDate, rawTask.reminder_date);
  assert.strictEqual(formattedTask.isRecurring, false);

  const dbTask = TaskModel.toDbTask({
    user: 'user-123',
    title: 'New Task',
    status: 'completed',
    dueDate: '2026-10-20T00:00:00.000Z',
    isRecurring: true,
  });
  assert.strictEqual(dbTask.user_id, 'user-123');
  assert.strictEqual(dbTask.due_date, '2026-10-20T00:00:00.000Z');
  assert.strictEqual(dbTask.is_recurring, true);
  console.log('   ✅ Task model normalization & DB mapping passed');

  // Test 3: Category Normalization
  console.log('\n3. Testing Category model normalization');
  const rawCategory = {
    id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    user_id: null,
    name: 'Work',
    color: '#3b82f6',
    icon: 'briefcase',
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const formattedCat = CategoryModel.formatCategory(rawCategory);
  assert.strictEqual(formattedCat.id, rawCategory.id);
  assert.strictEqual(formattedCat._id, rawCategory.id);
  assert.strictEqual(formattedCat.isDefault, true);
  console.log('   ✅ Category model normalization passed');

  // Test 4: PostgreSQL Error Handler Responses
  console.log('\n4. Testing PostgreSQL & Supabase error code handling');
  function mockRes() {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; }
    };
    return res;
  }

  // 4a. Unique violation (23505)
  const res23505 = mockRes();
  errorHandler({ code: '23505', message: 'duplicate key' }, {}, res23505, () => {});
  assert.strictEqual(res23505.statusCode, 400);
  assert.strictEqual(res23505.body.success, false);
  assert.ok(res23505.body.message.includes('Duplicate field value'));

  // 4b. Invalid UUID (22P02)
  const res22P02 = mockRes();
  errorHandler({ code: '22P02', message: 'invalid input syntax for type uuid' }, {}, res22P02, () => {});
  assert.strictEqual(res22P02.statusCode, 404);
  assert.strictEqual(res22P02.body.success, false);

  // 4c. Supabase PGRST116 (Not found)
  const resPGRST = mockRes();
  errorHandler({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, {}, resPGRST, () => {});
  assert.strictEqual(resPGRST.statusCode, 404);
  console.log('   ✅ Error handler tests passed');

  console.log('\n🎉 ALL SUPABASE MIGRATION UNIT TESTS PASSED SUCCESSFULLY! 🚀\n');
}

runSupabaseUnitTests().catch((err) => {
  console.error('❌ Supabase test failed:', err);
  process.exit(1);
});
