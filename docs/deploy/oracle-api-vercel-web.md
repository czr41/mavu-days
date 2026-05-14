# Beginner guide: API on Oracle Cloud VM + web on Vercel

This guide assumes you have **zero** experience with Oracle Cloud or Vercel. Follow the parts **in order**: API on the VM first (so you get a stable `https://` URL), then the website on Vercel.

**What you need before starting**

| Thing | Why |
| ----- | --- |
| A **GitHub** account | Your code lives in a repo; both Oracle and Vercel pull from it. |
| This repo **pushed to GitHub** | Oracle and Vercel clone or connect to that repository. |
| A **Supabase** project | Your database is already there; the API connects with connection strings. |
| Your domain **mavudays.com** | **API:** `api.mavudays.com` → Oracle. **Site:** `www` / apex → Vercel (see **Your domain: mavudays.com** below). |
| (~Optional **Oracle Cloud** “Always Free” tier) | Policies change — check [Oracle’s current free tier](https://www.oracle.com/cloud/free/) when you sign up. |

**Big picture**

1. **Supabase** = database (you already use this).  
2. **Oracle VM** = runs **only** the **API** (Fastify in `apps/api`).  
3. **Vercel** = runs **only** the **Next.js site** (`apps/web`).  
4. Browsers talk to **Vercel**; the site calls your **Oracle API** using `NEXT_PUBLIC_API_URL`.

### Your domain: **mavudays.com**

Use the domain at your **registrar** (where you bought the name) or in **Cloudflare** if you pointed nameservers there. Add records **after** you know the Oracle **public IP** and have a **Vercel** project (Vercel shows exact targets under **Settings → Domains**).

| Hostname | Points to | Purpose |
| -------- | --------- | -------- |
| **`api.mavudays.com`** | **A** → Oracle VM **public IPv4** | HTTPS API (Caddy on the VM). Use this in **Caddyfile** and in **`NEXT_PUBLIC_API_URL`**. |
| **`www.mavudays.com`** | **CNAME** → value Vercel gives you (often `cname.vercel-dns.com` or project-specific) | Public website on Vercel. |
| **`mavudays.com`** (apex) | Either **redirect** to `https://www.mavudays.com` at the registrar, or add the **apex** in Vercel **Domains** and use **A/ALIAS** as Vercel instructs | Many teams use **www** as canonical and redirect bare domain. |

**Environment variables (once DNS works)**

| Where | Variable | Example value |
| ----- | -------- | --------------- |
| **Vercel** | `NEXT_PUBLIC_API_URL` | `https://api.mavudays.com` (no trailing slash) |
| **Vercel** | `NEXT_PUBLIC_SITE_URL` | `https://www.mavudays.com` or `https://mavudays.com` (match what users see in the browser) |
| **Oracle `.env`** | *(none for the domain)* | Caddy handles TLS; API still uses `API_HOST`/`API_PORT` as in Part 6 (Caddy). |

Replace `api.yourdomain.com` in the steps below with **`api.mavudays.com`**.

### Start here if the VM already exists (skip Part 2)

You **do not** create the machine again. Do this **in order** on the VM (SSH) and on your PC (DNS / Vercel only):

1. **Network** — Ports **80**, **443**, and **22** allowed on the subnet / security list / NSG (same place you fixed SSH). Without **80+443**, HTTPS and Let’s Encrypt will fail.  
2. **DNS** — At your registrar: **`api.mavudays.com`** → **A** → your VM’s **public IPv4** (the dotted number on the instance page, not an OCID).  
3. **SSH** into the VM — Use **Ubuntu** + your key + **public IP** (Oracle **Connect** shows the exact command).  
4. **Install** — `git`, **Node.js 20**, then **`git clone`** this repo into e.g. **`/opt/mavu-days`**.  
5. **`.env`** — On the server, create **`/opt/mavu-days/.env`** with `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`, and API bind settings (see Part 5).  
6. **Build** — `cd /opt/mavu-days` → **`npm ci`** → **`npm run build:api`**.  
7. **Caddy** — Install **Caddy**, set **`/etc/caddy/Caddyfile`** so **`api.mavudays.com`** reverse-proxies to **`127.0.0.1:3001`**, set **`API_HOST=127.0.0.1`** in `.env`, reload Caddy.  
8. **systemd** — Unit file so **`node apps/api/dist/index.js`** runs after reboot (`mavu-api.service` — see Part 7).  
9. **Test** — Browser: **`https://api.mavudays.com/health/live`**.  
10. **Vercel** — Not on Oracle: set **`NEXT_PUBLIC_API_URL=https://api.mavudays.com`** and deploy the web app (Part 8).

**Part 2 below** (“Create the Oracle Cloud VM”) is only for people who have **not** created an instance yet — you can **ignore** it.

---

## Part 1 — Things you copy from Supabase (for the VM later)

You will paste these into a file on the server (never commit that file to Git).

1. Open **[supabase.com](https://supabase.com)** and sign in.  
2. Open your **project**.  
3. Click **Project Settings** (gear icon in the left sidebar) or use **Connect** from the top bar.  
4. Go to **Connect** → tab **ORM** → **Prisma** (or **Database** → connection strings).  
5. Copy **two** Postgres URLs:
   - **Transaction pool** / **Session pool** with port **6543** and `pgbouncer=true` → this becomes **`DATABASE_URL`** on the server.  
   - **Direct** connection with host like **`db.<project-ref>.supabase.co`** and port **5432** → this becomes **`DIRECT_URL`**.  
6. Keep your **database password** handy; if it has special characters like `@`, you must **URL-encode** them in the string (see [vercel-supabase.md](./vercel-supabase.md)).

You do **not** need the Supabase “anon” or “service role” keys for this app’s API — Prisma uses the Postgres URLs only.

---

## Part 2 — Create the Oracle Cloud VM (Ampere + Ubuntu)

### 2.1 Log in and pick your region

1. Go to **[cloud.oracle.com](https://cloud.oracle.com)** and sign in (create an account if needed).  
2. Top menu: confirm **Region** (e.g. **India South Mumbai** if that matches your Supabase region — not required, but latency helps).  
3. Open the **navigation menu** (☰ top left) → **Compute** → **Instances**.

### 2.2 Create the instance

1. Click **Create instance**.  
2. **Name:** e.g. `mavu-api`.  
3. **Placement:** leave defaults unless you know you need a specific **Availability Domain**.  
4. **Image:** click **Change image** → choose **Canonical Ubuntu** (e.g. **22.04**) for **ARM** (aarch64). **_Do not_** pick an x86 image — Ampere needs ARM.  
5. **Shape:** click **Change shape** → **Ampere** / **A1.Flex** (or another **ARM** shape). Start with **1 OCPU, 6 GB RAM** if available (builds may fail on 1 GB without swap).  
6. **Networking:**  
   - If you have no VCN, use **Create new virtual cloud network** and let the wizard create subnets (simplest).  
   - Ensure the instance gets a **public IPv4** address (**Assign public IPv4** = yes).  
7. **SSH keys:**  
   - Choose **Generate a key pair for me** *or* upload your **public** key if you already use SSH.  
   - If Oracle generates keys, **download the private key** (`*.key`) and store it safely — you need it to log in.  
8. Review and click **Create**. Wait until **State** = **RUNNING** (refresh the instance list).

### 2.3 Open firewall ports (so the internet can reach SSH, HTTP, HTTPS)

Traffic hits a **virtual firewall** in Oracle **before** it reaches your VM. You must allow:

- **TCP 22** — SSH.  
- **TCP 80** — HTTP (Let’s Encrypt challenges, redirects).  
- **TCP 443** — HTTPS (Caddy → API).

There are **two** places rules might live — check **both** if something still doesn’t work:

| Mechanism | What it is |
| --------- | ---------- |
| **Security list** | Firewall rules tied to a **subnet** (very common). |
| **Network Security Group (NSG)** | Firewall rules tied to the instance’s **network interface (VNIC)**. |

**If either blocks a port, the connection fails** (browser shows timeout / connection refused from outside).

---

#### A) Add rules on the subnet’s Security List (try this first)

1. Sign in to **[cloud.oracle.com](https://cloud.oracle.com)** and select the **same region** as your VM (top bar).  
2. Open the **menu (☰)** → **Networking** → **Virtual Cloud Networks**.  
3. Click the **VCN name** your instance uses (if unsure: **Compute** → **Instances** → your instance → scroll to **Primary VNIC** → click the **Subnet** link → note the **VCN**).  
4. In the left sidebar under **Resources**, click **Security Lists**.  
5. Click the security list that is associated with your instance’s **subnet** (often named **Default Security List** for … or similar).  
6. Under **Ingress Rules**, click **Add Ingress Rules**.  
7. Fill **one rule per row**. For each rule use:

   - **Source Type:** `CIDR`  
   - **Source CIDR:** `0.0.0.0/0` (the whole internet) — or your home IP in the form `203.0.113.50/32` for stricter SSH (port 22 only).  
   - **IP Protocol:** `TCP`  
   - **Source Port Range:** leave **empty** or **All** (depends on console; if required, use `All`).  
   - **Destination Port Range:** one port only per rule: `22`, then add another rule for `80`, then another for `443`.

8. Click **Add Ingress Rules** at the bottom. Repeat until you have three rules (**22**, **80**, **443**), unless **22** is already there.

**Quick reference (three separate rules):**

| Source CIDR   | IP Protocol | Destination port range | Description |
| ------------- | ----------- | ---------------------- | ----------- |
| `0.0.0.0/0`   | TCP         | **22**                 | SSH         |
| `0.0.0.0/0`   | TCP         | **80**                 | HTTP        |
| `0.0.0.0/0`   | TCP         | **443**                | HTTPS       |

---

#### B) If it still doesn’t work — add the same ports on an NSG

Some setups attach a **Network Security Group** to the instance VNIC.

1. **Compute** → **Instances** → click your instance (e.g. `mavu-farm-server`).  
2. Scroll to **Resources** → **Attached VNICs** → click the **VNIC name**.  
3. Find **Network Security Groups**. If an NSG is listed, **click its name**.  
4. Open **Network Security Group** details → **Add Ingress Rules**.  
5. Add the **same three ports** (**TCP 22**, **TCP 80**, **TCP 443**) from **`0.0.0.0/0`** (or restrict **22** as above).

---

#### After you save

- Rules apply within **seconds to a minute** (no reboot of the VM required).  
- **Ubuntu’s own firewall** (`ufw`) is usually **inactive** on fresh Oracle images; if you enabled `ufw`, also allow ports there (`sudo ufw allow 22,80,443/tcp`).

**(Stricter SSH):** use `your.public.ip.address/32` as **Source CIDR** **only** on the rule for port **22**, so only your home/office IP can SSH. Ports **80** and **443** usually stay `0.0.0.0/0` so Let’s Encrypt and visitors can reach the site.

### 2.4 Note the public IP

1. **Compute** → **Instances** → click **`mavu-api`**.  
2. Under **Primary VNIC** → **IPv4 addresses**, copy **Public IPv4 address** (e.g. `129.154.x.x`).

---

## Part 3 — Connect to the VM with SSH (first time)

**Windows (recommended: PowerShell or Windows Terminal)**

1. Save your **private key** as e.g. `C:\Users\YourName\oci.key`.  
2. Restrict permissions (PowerShell as Administrator optional):  
   `icacls C:\Users\YourName\oci.key /inheritance:r /grant:r "$env:USERNAME:(R)"`  
3. SSH (Ubuntu image default user is usually **`ubuntu`** — if connection fails, check the instance **Connect** instructions on the Oracle instance page for the exact username):

```text
ssh -i C:\Users\YourName\oci.key ubuntu@YOUR_PUBLIC_IP
```

Type **`yes`** if asked to trust the host. You should see a shell prompt like `ubuntu@...:~$`.

**macOS / Linux**

```bash
chmod 600 ~/Downloads/your-key.key
ssh -i ~/Downloads/your-key.key ubuntu@YOUR_PUBLIC_IP
```

If login fails, on the Oracle **Instance details** page click **Connect** — Oracle shows the exact **`ssh ...`** command and username.

---

## Part 4 — Install Node.js and Git on the VM

Run these **on the VM** (after SSH works):

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
```

Install **Node.js 20 LTS** (example using NodeSource — if this fails, use **[nvm](https://github.com/nvm-sh/nvm)** instead and install `node 20`):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should show v20.x
npm -v
```

---

## Part 5 — Put your code on the server

### 5.1 Clone from GitHub

**If the repo is private**, use a **Personal Access Token** (GitHub → **Settings** → **Developer settings** → **Personal access tokens**) with **repo** scope, and clone via HTTPS:

```bash
sudo mkdir -p /opt/mavu-days
sudo chown "$USER":"$USER" /opt/mavu-days
cd /opt/mavu-days
git clone https://github.com/YOUR_USER/YOUR_REPO.git .
```

When Git asks for password, paste the **token** (not your GitHub password).

### 5.2 Create the `.env` file on the server

```bash
nano /opt/mavu-days/.env
```

Paste **real** values (from Supabase and your secrets). Minimum:

```env
NODE_ENV=production

# Pooled — Supabase transaction pooler :6543 + pgbouncer=true
DATABASE_URL="postgresql://..."

# Direct — db.<project>.supabase.co :5432, user postgres
DIRECT_URL="postgresql://..."

# Random string, at least 32 characters — use a NEW one for production
JWT_SECRET=paste-a-long-random-secret-here-at-least-32-chars

API_HOST=0.0.0.0
API_PORT=3001

MOCK_PAYMENTS=false
```

Save: **Ctrl+O**, Enter, **Ctrl+X**.

Lock the file:

```bash
chmod 600 /opt/mavu-days/.env
```

### 5.3 Install dependencies and build the API

```bash
cd /opt/mavu-days
npm ci
npm run build:api
```

- If **`JavaScript heap out of memory`**: add **swap** or upgrade the VM shape, then retry.  
- If **`npm ci` fails**, read the error — usually network or Node version.
- If **`Could not find a declaration file for module '@mavu/db'` (TS7016)**: **`packages/db/dist/index.d.ts` is produced only by **`npm run build -w @mavu/db`**; it never ships in Git.** From **`/opt/mavu-days`**, run **`git pull`** so `apps/api` has **`prebuild`** (runs workspace builds before **`tsc`**)**, then **`npm run build:api`**. Verify with **`grep prebuild apps/api/package.json`** and **`ls packages/db/dist/index.d.ts`**.

---

## Part 6 — HTTPS with Caddy (simplest option)

Browsers and Vercel need **`https://`** for your API. **Caddy** gets free certificates from Let’s Encrypt automatically.

### 6.1 Point a DNS name at the VM (strongly recommended)

At your domain registrar (Namecheap, Cloudflare, Google Domains, etc.):

1. Add an **A** record: **`api.yourdomain.com`** → **your Oracle public IPv4**.  
2. Wait a few minutes for DNS to propagate (up to 30+ minutes sometimes).

You can skip DNS temporarily and use only IP for testing, but **Let’s Encrypt usually needs a real hostname**.

### 6.2 Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 6.3 Configure Caddy

Make the API listen only on localhost (good with Caddy). In **`.env`**, set:

```env
API_HOST=127.0.0.1
API_PORT=3001
```

Create the site file (replace `api.yourdomain.com`):

```bash
echo 'api.yourdomain.com {
  reverse_proxy 127.0.0.1:3001
}' | sudo tee /etc/caddy/Caddyfile
```

Reload Caddy:

```bash
sudo systemctl reload caddy
sudo systemctl status caddy
```

---

## Part 7 — Run the API with systemd (keeps it alive after reboot)

```bash
sudo nano /etc/systemd/system/mavu-api.service
```

Paste (adjust **User** if not `ubuntu`, and path if not `/opt/mavu-days`):

```ini
[Unit]
Description=Mavu Days API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/mavu-days
EnvironmentFile=/opt/mavu-days/.env
ExecStart=/usr/bin/node apps/api/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mavu-api
sudo systemctl status mavu-api
```

Logs if something fails:

```bash
journalctl -u mavu-api -e --no-pager
```

### 7.1 Smoke tests (from your laptop browser or curl)

Replace with your real host:

- **`https://api.yourdomain.com/health/live`** — should return JSON with `"ok":true` (no DB).  
- **`https://api.yourdomain.com/health`** — checks database connectivity.

**Your Oracle API base URL** for the next part is **`https://api.yourdomain.com`** (no trailing slash).

---

## Part 8 — Deploy the website on Vercel

### 8.1 Sign up / log in

1. Open **[vercel.com](https://vercel.com)**.  
2. Click **Log In** → **Continue with GitHub** (recommended) and authorize Vercel.

### 8.2 Import the project

1. From **Dashboard**, click **Add New…** → **Project**.  
2. Under **Import Git Repository**, find your **`mavu-days`** (or your repo name) → **Import**.  
3. If the repo is missing, click **Adjust GitHub App Permissions** and allow the correct org/repo.

### 8.3 Configure the project (critical step)

On the **Configure Project** screen:

1. **Framework Preset:** **Next.js** (auto-detected).  
2. **Root Directory:** click **Edit** → set to **`apps/web`** → **Continue**.  
3. **Build Command** / **Install Command:** leave **default** — this repo’s [apps/web/vercel.json](../../apps/web/vercel.json) sets `cd ../.. && npm ci` and `npm run build -w @mavu/web`. Do **not** override unless you know what you’re doing.

### 8.4 Environment variables (before first Deploy)

Expand **Environment Variables** and add ( **Production** at minimum):

| Name | Value | Notes |
| ---- | ----- | ----- |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | Same URL as Oracle API — **no** `/` at the end. |
| `NEXT_PUBLIC_SITE_URL` | `https://something.vercel.app` | After first deploy you can copy the real URL from Vercel and **redeploy** with the exact value, or use your custom domain later. |
| `NEXT_PUBLIC_ORG_SLUG` | e.g. `mavu-days-2` | Must match the organization you create in the **production** database. |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | *(optional)* | |
| `NEXT_PUBLIC_BOOKING_EMAIL` | *(optional)* | |

You typically **do not** set `DATABASE_URL` on Vercel for this project — the web app does not use Prisma in the browser.

Click **Deploy**. Wait for **Building** → **Ready**.

### 8.5 Open the site

1. When the deploy finishes, click **Visit** or open the **`.vercel.app`** URL.  
2. **Chrome / Edge:** press **F12** → **Network** tab → reload the page — requests that load data should go to **`NEXT_PUBLIC_API_URL`** (your Oracle domain).  
3. If the site loads but data fails: check **Oracle API** logs (`journalctl`) and that **`NEXT_PUBLIC_API_URL`** is exactly **`https://`** and matches Caddy.

### 8.6 (Optional) Add a custom domain on Vercel

1. Project → **Settings** → **Domains**.  
2. Add **`www.yourdomain.com`** or apex domain — follow DNS instructions (usually **CNAME** or **A** records Vercel shows).  
3. Update **`NEXT_PUBLIC_SITE_URL`** to that URL and **Redeploy**.

---

## Part 9 — First-time production data (org + seed)

If your **Supabase** database is empty of your real org:

1. **Register** by sending **`POST /auth/register`** to **`https://api.yourdomain.com/auth/register`** with JSON body `email`, `password`, `organizationName`, `organizationSlug` (same slug as **`NEXT_PUBLIC_ORG_SLUG`**). You can use **Thunder Client**, **Postman**, or `curl` from your PC.  
2. From a computer that has **`DATABASE_URL`** + **`DIRECT_URL`** in `.env` (or exported):

   ```bash
   export SEED_ORG_SLUG=your-slug
   npm ci
   npm run db:seed -w @mavu/db
   ```

---

## If something breaks (quick map)

| Symptom | Where to look |
| ------- | ------------- |
| Cannot SSH | Security list / NSG port **22**; correct **private key**; correct **username** from Oracle **Connect**. |
| `502` / bad gateway from Caddy | `systemctl status mavu-api` — API not running or wrong **port**. |
| API works over HTTP IP but not HTTPS | DNS not pointing to VM yet; wait for propagation; check **Caddy** logs: `journalctl -u caddy -e`. |
| Vercel build fails | Build logs in Vercel — often wrong **Root Directory** (must be **`apps/web`**). |
| Site loads, API calls fail (CORS / network) | **`NEXT_PUBLIC_API_URL`** wrong or HTTP instead of HTTPS; API down (`/health/live`). |

---

## Reference links inside this repo

- [vercel-supabase.md](./vercel-supabase.md) — Supabase URL shapes and Prisma notes.  
- [cloud-lite.md](./cloud-lite.md) — Hosted API patterns and `migrate:deploy:ci`.
