const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY, // service role — never expose to frontend
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = supabase;
