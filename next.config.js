/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['nmxdyyikfuqgkunrmdri.supabase.co'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://nmxdyyikfuqgkunrmdri.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teGR5eWlrZnVxZ2t1bnJtZHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NjcwNDYsImV4cCI6MjA1MTQ0MzA0Nn0.oysb5KrzAv58lzDcE2_NCGtncDUzAcK5AYC-OyrHEXM'
  }
}

module.exports = nextConfig 