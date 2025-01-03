import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nmxdyyikfuqgkunrmdri.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teGR5eWlrZnVxZ2t1bnJtZHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NjcwNDYsImV4cCI6MjA1MTQ0MzA0Nn0.oysb5KrzAv58lzDcE2_NCGtncDUzAcK5AYC-OyrHEXM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 