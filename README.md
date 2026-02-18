# Smart Bookmark App

A real-time bookmark manager built with Next.js, Supabase, and Google OAuth. Users can save, organize, and delete bookmarks with instant synchronization across multiple browser tabs.

🔗 **Live Demo:** [Your Vercel URL here]

---

## Features

- ✅ Google OAuth authentication (no email/password)
- ✅ Private bookmarks per user (enforced by Row Level Security)
- ✅ Real-time synchronization across multiple tabs
- ✅ Instant UI updates without page refresh
- ✅ Clean, responsive design with Tailwind CSS

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Auth, PostgreSQL, Realtime)
- **Deployment:** Vercel
- **Authentication:** Google OAuth 2.0

---

## Architecture

```
Next.js App Router (Vercel)
    ↓
Supabase Client
    ↓
┌─────────────────────────────────┐
│         Supabase                │
│  ┌──────────┐  ┌──────────┐    │
│  │   Auth   │  │ Database │    │
│  │ (Google) │  │  (RLS)   │    │
│  └──────────┘  └──────────┘    │
│       ↓             ↓           │
│  ┌──────────────────────────┐  │
│  │   Realtime (WebSocket)   │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase account
- A Google Cloud Console account
- A Vercel account (for deployment)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/smart-bookmark-app.git
cd smart-bookmark-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run:

```sql
-- Create bookmarks table
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table bookmarks enable row level security;

-- RLS Policies
create policy "Users can view own bookmarks"
  on bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on bookmarks for delete
  using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table bookmarks;

-- Enable replica identity for DELETE events
alter table bookmarks replica identity full;
```

3. Get your **Project URL** and **anon key** from **Settings → API**

### 3. Set up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. **APIs & Services → OAuth consent screen** → External → Fill in app details
4. **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
5. Add authorized redirect URI:
   ```
   http://localhost:3000/auth/callback
   ```
6. Copy **Client ID** and **Client Secret**
7. In Supabase: **Authentication → Providers → Google** → Enable and paste credentials

### 4. Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Run locally
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Deployment to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → Import repository
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (add your Vercel URL after first deploy, then redeploy)
3. Deploy

### 3. Update OAuth redirect URIs

**Google Cloud Console:**
- Add `https://your-app.vercel.app/auth/callback`

**Supabase:**
- Authentication → URL Configuration → Add `https://your-app.vercel.app/auth/callback`

### 4. Redeploy
Force a fresh deployment in Vercel to pick up the `NEXT_PUBLIC_SITE_URL` environment variable.

---

## Problems Encountered & Solutions

### Problem 1: OAuth Redirect Loop
**Issue:** After Google login, user was stuck on Google's page and not redirected back to the app.

**Root Cause:** The `redirectTo` URL in the OAuth flow was pointing to Supabase's callback (`/auth/v1/callback`) instead of our app's callback route.

**Solution:** Changed the redirect URL to point to our Next.js app:
```typescript
redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
```

Also added the correct redirect URI to Google Cloud Console and Supabase dashboard.

---

### Problem 2: Real-time Insert Not Working
**Issue:** Adding a bookmark required a page refresh to see the new item.

**Root Cause:** Realtime wasn't enabled on the `bookmarks` table in Supabase.

**Solution:** Enabled Realtime replication:
```sql
alter publication supabase_realtime add table bookmarks;
```

Verified in Supabase dashboard: **Database → Replication → Enable bookmarks table**

---

### Problem 3: Real-time Delete Not Broadcasting
**Issue:** Deleting a bookmark worked in the database but didn't update the UI in real-time.

**Root Cause:** Postgres wasn't configured to include the full row data in DELETE events, so Realtime couldn't determine which user to notify.

**Solution:** Enabled full replica identity:
```sql
alter table bookmarks replica identity full;
```

This tells Postgres to include all column values (including `user_id`) in DELETE events, allowing Realtime to properly filter and broadcast to the correct user.

---

### Problem 4: Production Redirect to Localhost
**Issue:** After deploying to Vercel, Google OAuth redirected users back to `localhost:3000` instead of the production URL.

**Root Cause:** The `NEXT_PUBLIC_SITE_URL` environment variable was added after the initial deployment and wasn't included in the build.

**Solution:** 
1. Set `NEXT_PUBLIC_SITE_URL` in Vercel environment variables
2. Forced a fresh deployment (unchecked "Use existing build cache")
3. Environment variables with the `NEXT_PUBLIC_` prefix must be set before build time to be embedded in the client bundle

---

### Problem 5: Tailwind CSS v4 Build Error on Vercel
**Issue:** Build failed with PostCSS error on Vercel deployment.

**Root Cause:** Typo in `globals.css` — used `@import "tailwindCSS"` instead of `@import "tailwindcss"`.

**Solution:** Fixed the import to lowercase:
```css
@import "tailwindcss";
```

**Learning:** Tailwind v4 uses a simplified setup — just one import line, no config files needed.

---

## Learning Journey: First Time with Supabase

This project was my **first experience with Supabase**. Coming from a background of building custom backends with Express/Node.js, the Backend-as-a-Service (BaaS) approach was completely new territory.

### Initial Challenges

**Challenge 1: Understanding the Mental Model**
- **Problem:** Used to thinking about REST APIs, routes, and controllers. Supabase's approach of "just query the database directly from the frontend" felt wrong at first.
- **Learning:** Row Level Security (RLS) is the key. The security isn't in hiding endpoints — it's baked into the database itself. Even if someone bypassed my UI entirely, Postgres would reject unauthorized queries.
- **Aha Moment:** When I realized that `supabase.from('bookmarks').select()` automatically filters by RLS policies, and there's no way to bypass it without valid authentication.

**Challenge 2: Server vs. Client Supabase Instances**
- **Problem:** Initially tried using the same Supabase client everywhere. Got confusing errors about cookies not being set.
- **Learning:** Next.js App Router requires **two different Supabase clients**:
  - `@supabase/ssr` with `createServerClient` for Server Components (reads from cookies)
  - `@supabase/ssr` with `createBrowserClient` for Client Components (uses localStorage/cookies in browser)
- **Solution:** Created separate `lib/supabase/server.ts` and `lib/supabase/client.ts` files. Now it's crystal clear which environment each component runs in.

**Challenge 3: Realtime Wasn't "Just Working"**
- **Problem:** Expected Realtime to work automatically after enabling it in the dashboard. Spent 30 minutes confused why INSERT events weren't showing up.
- **Learning:** Realtime requires THREE things to work:
  1. Enable the table in the Realtime publication (`alter publication supabase_realtime add table bookmarks`)
  2. RLS policies must allow you to SELECT the rows (Realtime respects RLS)
  3. For DELETE events specifically, you need `replica identity full` so Postgres includes the deleted row's data
- **Debugging Process:** Added `console.log` to the Realtime callback, discovered events weren't firing at all, then discovered the replication wasn't enabled.

**Challenge 4: Understanding the OAuth Flow**
- **Problem:** Initial confusion about where Google redirects after login. Thought Google would talk directly to Supabase.
- **Learning:** The flow is: **My App → Google → My App → Supabase**. Google never touches Supabase directly. My `/auth/callback` route is the middleman that exchanges the OAuth code for a session.
- **Solution:** Had to configure redirect URIs in THREE places:
  1. Google Cloud Console (where Google sends users after login)
  2. Supabase dashboard (whitelisting allowed callback URLs)
  3. My app code (`redirectTo` parameter in the OAuth call)

### What I Learned About Supabase Specifically

**Supabase is NOT just "Firebase with Postgres"**
- It's a real PostgreSQL database with full SQL access
- You can write raw SQL when needed (we did for table setup and policies)
- RLS policies are actual Postgres policies, not a Supabase abstraction
- This means it's production-grade and can scale to enterprise use cases

**The Developer Experience is Excellent**
- The JavaScript client (`supabase.from()`) is intuitive and type-safe
- Realtime "just works" once configured properly
- The dashboard is clear and well-organized
- Error messages are helpful (much better than debugging raw SQL errors)

**Row Level Security Changed How I Think About Security**
- Previously: "Write middleware to check if `req.user.id === resource.userId`"
- Now: "Write one RLS policy and the database enforces it everywhere"
- This is more secure because there's no way to accidentally forget a check

### Time Investment
- **Reading Supabase docs:** ~1 hour
- **Setting up first table with RLS:** ~30 minutes (lots of trial and error)
- **Getting Realtime working:** ~45 minutes (debugging the replica identity issue)
- **Understanding Auth flow:** ~20 minutes

**Total learning time:** ~2.5 hours from zero Supabase knowledge to a working production app.

### Would I Use Supabase Again?
**Absolutely yes.** For this type of CRUD app with real-time features, Supabase eliminated days of backend work. No Express server, no WebSocket server setup, no authentication system to build from scratch — just focus on the product features.

**When Supabase makes sense:**
- CRUD applications with standard data models
- Apps that need real-time features
- MVP/prototype development (ship fast)
- Small teams that don't want to maintain backend infrastructure

**When you might not use Supabase:**
- Complex business logic that belongs in backend services
- Apps with heavy computational requirements
- Situations requiring full control over database scaling/architecture

---

## Key Learnings

### 1. Next.js App Router Paradigm Shift
Coming from Pages Router, the App Router required understanding:
- **Server Components by default** — no `useState` or `useEffect` unless you add `'use client'`
- **Server Actions** — form submissions without API routes
- **Async components** — data fetching directly in component body

### 2. Row Level Security (RLS) is Non-Negotiable
RLS policies in Supabase enforce security at the database level. Even if someone bypassed the frontend, they couldn't access another user's data. This is far more secure than client-side checks.

### 3. Realtime Requires Special Configuration
Enabling Realtime isn't just a toggle — it requires:
- Adding the table to the `supabase_realtime` publication
- Proper RLS policies (Realtime respects them)
- `replica identity full` for DELETE events to include row data
- Filters in the subscription to avoid receiving all users' events

### 4. Environment Variables in Next.js
- `NEXT_PUBLIC_` prefix exposes variables to the browser
- Variables must be set **before build time** to be embedded in the client bundle
- Adding env vars to an existing Vercel deployment requires a fresh rebuild

### 5. OAuth Flow Understanding
The OAuth flow is: **Your App → Google → Your App → Supabase**. Google never talks directly to Supabase — it only redirects back to your app's callback route, which then exchanges the code with Supabase.

---

## Project Structure

```
smart-bookmark-app/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page with Google sign-in
│   ├── globals.css             # Tailwind imports
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # OAuth callback handler
│   └── dashboard/
│       └── page.tsx            # Main app (protected route)
├── components/
│   ├── BookmarkForm.tsx        # Add bookmark form
│   └── BookmarkList.tsx        # Display bookmarks + Realtime
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       └── server.ts           # Server Supabase client
├── middleware.ts               # Route protection & session refresh
└── README.md
```

---

## How It Works

### Authentication Flow
1. User clicks "Sign in with Google"
2. Next.js Server Action calls `supabase.auth.signInWithOAuth()`
3. User is redirected to Google's login page
4. After login, Google redirects to `/auth/callback` with an auth code
5. Callback route exchanges code for Supabase session
6. User is redirected to `/dashboard` with session cookies set

### Data Flow
1. Dashboard page fetches initial bookmarks on the server
2. `BookmarkList` component subscribes to Realtime changes on mount
3. When user adds a bookmark, `BookmarkForm` inserts into Supabase
4. Supabase broadcasts INSERT event via WebSocket
5. All open tabs receive the event and update UI instantly
6. Same flow for DELETE operations

### Security
- **Middleware** checks authentication on every request
- **RLS policies** enforce data isolation at the database level
- **Realtime filters** ensure users only receive their own events
- **Server Components** keep sensitive operations server-side

---

## Future Enhancements

- [ ] Add bookmark tags/categories
- [ ] Search and filter functionality
- [ ] Bookmark folders/collections
- [ ] Browser extension for one-click bookmarking
- [ ] Export bookmarks as JSON/CSV
- [ ] Bookmark preview with Open Graph metadata

---

## License

MIT

---

## Author

Built as a technical assessment project demonstrating full-stack development with modern Next.js, real-time features, and secure authentication patterns.