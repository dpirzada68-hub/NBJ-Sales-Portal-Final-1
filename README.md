# NBJ Sales Portal

Chassis-registration / agent sales tool with an admin panel, PDF receipts (jsPDF), and localStorage persistence.

## Run it locally

1. Install [Node.js](https://nodejs.org/) (v18 or newer) if you don't have it.
2. Open a terminal in this folder and run:

   ```bash
   npm install
   npm run dev
   ```

3. It will open automatically at **http://localhost:5173**

## Admin login

Default admin password (set inside `src/App.jsx`): `admin123`
Change it by editing the `AdminLogin` function in `src/App.jsx`.

## Notes

- The landing page loads the NBJ logo from `public/133745.png`.
- PDF generation (jsPDF + autotable) loads automatically from a CDN the first time the app opens — you need an internet connection for that to work, but no extra install is needed.
- **Data storage:** Sales, flags, chassis registry, and agents are now stored in a shared **Neon Postgres** database (via the `/api/kv` serverless function), not in the browser. This means every agent and the admin see the same data, from any device.

## Database setup (Neon on Vercel)

This project expects an environment variable called **`DATABASE_URL`** pointing to your Neon Postgres database. If you've connected Neon through Vercel's Storage tab with the prefix `DATABASE`, this is created automatically — no extra setup needed. The very first API call will automatically create the required table (`app_data`) if it doesn't exist yet.

⚠️ **Local development note:** Running `npm run dev` locally will NOT have access to `/api` functions or your `DATABASE_URL` unless you use the [Vercel CLI](https://vercel.com/docs/cli) (`vercel dev`) with your environment variables pulled down (`vercel env pull`). Without that, the app will still work locally, but data will only live in memory for that session (lost on refresh) since the API calls will fail silently in the background. This is expected — the real, shared data storage only works once deployed to Vercel with the database connected.

## Build for production

```bash
npm run build
npm run preview
```

This creates a `dist/` folder you can deploy to any static host (Netlify, Vercel, GitHub Pages, etc).
