# 💸 Free Deployment Guide (Vercel + Render)

Since Azure is blocked, use this "Hackathon Survival" stack. It allows for **real public URLs** without credit card blocks.

| Service    | Component               | Pricing                            |
| :--------- | :---------------------- | :--------------------------------- |
| **Render** | Backend (Express/Node)  | Free (spins down after inactivity) |
| **Vercel** | Frontend (Next.js)      | Free (always on)                   |
| **Local**  | Agent (Autonomous Loop) | Free (runs on your machine)        |

---

## 1. Deploy Backend to Render

1.  Push your code to **GitHub** (you already did this!).
2.  Go to [dashboard.render.com](https://dashboard.render.com) (Login with GitHub).
3.  Click **New +** > **Web Service**.
4.  Connect your **stacks-x402-challenge** repository.
5.  **Configure**:
    - **Name**: `synergi-backend`
    - **Region**: `US East` (closest to Stacks nodes)
    - **Root Directory**: `backend`
    - **Runtime**: `Node`
    - **Build Command**: `npm install && rm -rf dist && npm run build`
      - (Check `backend/package.json`: if `build` script is `tsc`, ensure typescript is installed or just `npm install`) -> _Correction_: Use `npm install`
    - **Start Command**: `npm run start:prod`
    - **Instance Type**: `Free`
6.  **Environment Variables**:
    - Copy keys from `backend/.env`:
      - `GEMINI_API_KEY`
      - `GROQ_API_KEY`
      - `AGENT_PRIVATE_KEY`
    - **Review & Create Web Service**.
7.  **Wait**: Render will deploy. Copy the URL (e.g., `https://synergi-backend.onrender.com`).

---

## 2. Deploy Frontend to Vercel

1.  Go to [vercel.com](https://vercel.com) (Login with GitHub).
2.  Click **Add New...** > **Project**.
3.  Import `stacks-x402-challenge`.
4.  **Configure**:
    - **Root Directory**: Click "Edit" causing a framework detection -> Select `frontend`.
    - **Framework Preset**: Next.js (Auto-detected).
5.  **Environment Variables**:
    - `NEXT_PUBLIC_API_URL`: **Paste your Render Backend URL** (e.g., `https://synergi-backend.onrender.com`).
6.  **Deploy**.
7.  Vercel will give you a domain (e.g., `synergi-frontend.vercel.app`).

---

## 3. Connect the Agent (Local)

The autonomous agent is designed to run 24/7. Host it locally to save costs and avoid timeouts.

1.  Open `agent/.env` locally.
2.  Update `SERVER_URL`:
    ```ini
    SERVER_URL=https://synergi-backend.onrender.com
    ```
3.  Run the agent:
    ```bash
    cd agent
    npm start
    ```

**Result**: You now have a fully distributed app:

- Frontend: Global CDN (Vercel)
- Backend: Cloud Server (Render)
- Agent: Local Worker
