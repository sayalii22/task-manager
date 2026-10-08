const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;
let isConnected = false;
let isFallback = false;

function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (
    !url ||
    !key ||
    url.includes('your-project') ||
    url.includes('<project-id>') ||
    key.includes('your-supabase-')
  ) {
    return null;
  }

  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err.message);
    return null;
  }
}

const connectDB = async () => {
  supabaseClient = initSupabase();

  if (!supabaseClient) {
    isConnected = false;
    isFallback = true;
    console.warn(`\n⚠️  NOTICE: Supabase credentials not configured in .env (or using placeholders).`);
    console.warn(`🚀 ACTIVATING LOCAL PERSISTENT FALLBACK MODE:`);
    console.warn(`   All REST APIs, JWT Auth, Task CRUD, and Kanban features will run seamlessly!`);
    console.warn(`   To connect your live Supabase database, set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.\n`);
    return false;
  }

  try {
    console.log(`🔌 Verifying Supabase connection to: ${process.env.SUPABASE_URL}...`);
    // Lightweight check
    const { error } = await supabaseClient.from('users').select('id').limit(1);

    if (error && error.code !== 'PGRST116') {
      if (error.code === '42P01') {
        console.warn(`⚠️ Supabase connected, but 'users' table not found. Please run supabase/schema.sql in your Supabase SQL editor.`);
      } else {
        throw error;
      }
    }

    isConnected = true;
    isFallback = false;
    console.log(`✅ Supabase PostgreSQL Connected Successfully: ${process.env.SUPABASE_URL}`);
    return true;
  } catch (error) {
    isConnected = false;
    isFallback = true;
    console.warn(`\n⚠️  NOTICE: Unable to connect to Supabase (${error.message}).`);
    console.warn(`🚀 ACTIVATING LOCAL PERSISTENT FALLBACK MODE.\n`);
    return false;
  }
};

const getStatus = () => ({
  isConnected,
  isFallback,
  ready: isConnected || isFallback,
  provider: isConnected ? 'Supabase PostgreSQL' : 'Persistent Fallback Store',
});

module.exports = {
  connectDB,
  getStatus,
  get supabase() {
    if (!supabaseClient) {
      supabaseClient = initSupabase();
    }
    return supabaseClient;
  },
  get isConnected() {
    return isConnected;
  },
  get isFallback() {
    return isFallback;
  },
};
