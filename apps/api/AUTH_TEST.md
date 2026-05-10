# Be Celeb Auth API Test

This guide covers the MVP auth routes served by the Next.js app.

## Run the web server

```bash
npm --workspace apps/web run dev
```

The local URL is:

```txt
http://localhost:3000
```

## Provider selection

- If `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set, the API uses Supabase Auth and Supabase DB.
- If any Supabase env value is missing and `NODE_ENV !== "production"`, the API uses the development JSON fallback.
- If any Supabase env value is missing and `NODE_ENV === "production"`, the API returns `503`.

The JSON fallback stores users at:

```txt
apps/api/dev-data/users.json
```

The file is created automatically on first signup. Passwords are stored as hashes only.

## Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","nickname":"tester"}'
```

## Login and save cookies

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Read my account

```bash
curl -b cookies.txt http://localhost:3000/api/me
```

## Logout

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

## Browser test

1. Start the web server.
2. Open `http://localhost:3000/signup`.
3. If the UI is not wired yet, use the curl commands above.
4. After login, call `/api/me` in the browser or with curl using the saved cookie.
