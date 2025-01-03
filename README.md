# DevImpact Hackathon Registration

A modern registration platform for the DevImpact Hackathon.

## Deployment Steps

1. **Fork or Clone the Repository**
   ```bash
   git clone <repository-url>
   cd devimpact
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add the environment variables in Vercel's dashboard
   - Deploy!

## Features

- Multi-step registration form
- Team formation system
- Email notifications
- Admin dashboard
- Real-time updates
- Mobile responsive design

## Tech Stack

- Next.js 13
- Supabase
- Tailwind CSS
- Resend for emails
