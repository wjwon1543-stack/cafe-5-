<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/acce70d1-e96e-4265-b581-2e4a6d913aea

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel with Supabase

1. In Supabase, open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
2. Copy the Project URL and anon/publishable key from **Project Settings > API**.
3. In Vercel, import the GitHub repository and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings > Environment Variables** for the deployments you use.
4. Redeploy after adding or changing environment variables.

For local development, create `.env.local` from `.env.example` and fill in the Supabase values. Never commit `.env.local`, a service-role key, or other secrets. The browser app uses only the anon/publishable key; row-level security is configured by the SQL script.
