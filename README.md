# Snow Day Calculator — Next.js version

This is a complete replacement for the old HTML/PHP setup:

- The home page has the live snow-day calculator, header, footer, FAQ and blog preview.
- `/blog` lists every **published** post automatically.
- `/admin` is a simple private area where you can write posts, add images, save drafts and publish.
- Blog posts are stored in `data/posts.json` and uploaded images in `public/uploads`, so no database setup is required for local use.

## Run it locally

1. Open this `snow-day-nextjs` folder in a terminal.
2. Run `npm install` once.
3. Copy `.env.example` to a new file named `.env.local`.
4. Change all three values in `.env.local`, especially the password and `AUTH_SECRET`.
5. Run `npm run dev`.
6. Open `http://localhost:3000` in your browser.

The first time you visit `/admin`, sign in using the username and password you put in `.env.local`.

## Writing a blog post

1. Visit `http://localhost:3000/admin` and sign in.
2. Click **New post**.
3. Add a title, short description and article content.
4. Choose **Publish now** under “Post status”, then click **Create post**.

That article immediately appears in both `/blog` and the home-page blog section. Leave the status as **Save as draft** while you are still writing.

## Moving existing PHP posts (optional)

The old site stores its active posts in `admin/includes/data/posts.json` (not the empty `admin/data/posts.json`). To import those posts and their images, run this from inside the new project:

```powershell
node scripts/import-php-posts.mjs "C:\Users\Shefu\Desktop\admin\includes\data\posts.json" "C:\Users\Shefu\Desktop\admin\includes\uploads"
```

Restart the development server after importing. The old content will then be available in the new admin dashboard, where you can edit it.

## Before putting it online

This starter intentionally uses files for post and image storage because it is easiest to understand and works very well on your computer or on a traditional Node server/VPS. Hosting services with temporary server storage can lose new posts/uploads when they restart. For those hosts, replace the two storage areas with a database and permanent image storage first.

Also make sure `.env.local` is never uploaded to GitHub or shared publicly.
