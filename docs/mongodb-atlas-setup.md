# MongoDB Atlas Setup (Free M0 Cluster)

## 1. Create a Free Cluster

1. Go to https://www.mongodb.com/atlas
2. Sign up / Log in
3. Click **Build a Database** → choose **M0 FREE** (512MB, always free)
4. Cloud provider: AWS | Region: pick closest to you
5. Cluster name: `autoui-cluster` → **Create**

## 2. Create a Database User

1. Left sidebar → **Database Access** → **Add New Database User**
2. Authentication: Password
3. Username: `autoui_user`
4. Password: generate a strong one, **copy it**
5. Role: **Atlas admin** (or just `readWriteAnyDatabase`)
6. **Add User**

## 3. Whitelist All IPs (for Render.com)

1. Left sidebar → **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** → `0.0.0.0/0`
3. **Confirm**

> This is required because Render.com uses dynamic IPs.

## 4. Get Your Connection String

1. Left sidebar → **Database** → **Connect** on your cluster
2. Choose **Connect your application**
3. Driver: Python | Version: 3.12 or later
4. Copy the connection string — looks like:
   ```
   mongodb+srv://autoui_user:<password>@autoui-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Add your database name at the end:
   ```
   mongodb+srv://autoui_user:yourpass@autoui-cluster.xxxxx.mongodb.net/autoui?retryWrites=true&w=majority
   ```

## 5. Add to .env

```env
MONGODB_URL=mongodb+srv://autoui_user:yourpass@autoui-cluster.xxxxx.mongodb.net/autoui?retryWrites=true&w=majority
MONGODB_DB_NAME=autoui
```

## No Schema Setup Needed

Unlike PostgreSQL, **MongoDB creates collections automatically** on first write.
The app creates indexes on startup via `init_db()`.

## Data Structure

Everything for one session lives in a single document in the `sessions` collection:

```json
{
  "_id": "session-uuid",
  "url": "https://app.example.com",
  "score": 72,
  "created_at": "2026-04-05T10:00:00Z",
  "metrics": { "LCP": 3.1, "CLS": 0.05, "INP": 210, "TTFB": 0.6 },
  "components": [
    { "name": "Dashboard", "renderTime": 120, "reRenders": 5 }
  ],
  "suggestions": [
    { "issue": "LCP too slow", "fix": "...", "category": "vitals", "impact_score": 0.35 }
  ]
}
```
