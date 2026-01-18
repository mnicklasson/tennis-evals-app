# Tennis Evaluations (MVP)

This is a simple "starter" app. It already has:
- Login (email+password AND magic link)
- Coach dashboard
- Coach can add players (including right/left-handed)
- Player inbox (shows sessions the player is allowed to see)
- Player evaluation detail (shows team + personal notes, using privacy rules)

## What you do (super simple)

### Part 1 — Paste the database setup in Supabase
1. Open Supabase
2. Click **SQL Editor**
3. Click **New query**
4. Open `sql/setup.sql` and copy everything
5. Paste into Supabase
6. Click **Run**

### Part 2 — Create your first club + coach profile (2 minutes)
1. In Supabase, go to **Table Editor**
2. Open table **clubs**
3. Click **Insert row**
4. Fill:
   - name: your club name
5. Save

Now we need to tell Supabase who you are:
1. Go to **Authentication** -> **Users**
2. Make sure you have a user (you can sign up in the app too)
3. Copy your **User UID**
4. Go to **Table Editor** -> table **users_profile**
5. Insert row:
   - user_id: (paste your UID)
   - club_id: (pick the club id from clubs)
   - role: coach
6. Save

### Part 3 — Run the app on your computer
1. Install Node.js (LTS)
2. Open a terminal in this folder
3. Run:
   - `npm install`
   - `npm run dev`
4. Open: http://localhost:3000

### Part 4 — Put your Supabase keys into the app
1. Copy `.env.example` to a new file called `.env.local`
2. In Supabase:
   - Settings -> API
   - Copy:
     - Project URL -> paste into NEXT_PUBLIC_SUPABASE_URL
     - anon public key -> paste into NEXT_PUBLIC_SUPABASE_ANON_KEY
3. Restart `npm run dev`

### Part 5 — Deploy (share with students)
Recommended: Vercel
1. Create a Vercel account
2. "Add new project"
3. Upload this folder or connect GitHub
4. In Vercel -> Environment Variables, add the same two keys:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
5. Click Deploy

You will get a link. That link is your app.

---

## Notes
- Right now, only "Players" is built on the coach side.
- Next steps: session creation + evaluation forms + club settings.
