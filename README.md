# InsightOps — Multi-Tenant AI Business Operations Platform

InsightOps is a production-grade, multi-tenant SaaS application built for modern business operations. It features real-time inventory management, expense tracking with statistical anomaly detection, employee scheduling with shift conflict detection, and an interactive streaming AI search assistant powered by Gemini.

## 🏆 Project Highlights & Architecture
* **Real Multi-Tenancy:** Complete tenant isolation using custom middleware that automatically scopes all Mongoose queries by `x-organization-id`.
* **AI Search Assistant (Gemini):** Translates natural language queries safely into secure MongoDB aggregation pipelines, displaying results dynamically as tables, bar charts, or pie charts with full conversation memory.
* **ML Anomaly Detection:** Implements a Z-Score statistical algorithm on expenses to automatically detect and flag anomalies (e.g., suspicious transaction jumps).
* **Real-time Engine:** Bidirectional event sync using Socket.io to push low stock alerts and financial anomalies directly to client drawers.
* **Premium Cyber Theme:** Rebuilt with a custom Obsidian dark theme, neon highlights, and glassmorphic cards for a cutting-edge developer vibe.

---

## 🛠️ Technology Stack

### Frontend (Client SPA)
* **Framework:** React 18 + TypeScript + Vite 4
* **UI Components:** Ant Design 5 (AntD)
* **Routing:** React Router v6
* **State & Fetching:** React Context + Axios (custom interceptors for JWT Bearer + Tenant ID injection)
* **Charts:** Recharts (responsive bars, areas, and pies)
* **Real-time:** Socket.io Client

### Backend (REST API)
* **Runtime:** Node.js 22 + Express.js + TypeScript 5
* **Authentication:** Stateful JWT tokens (7-day expiry) + HttpOnly refresh cookies + Google OAuth 2.0 (Passport.js)
* **Validation:** Zod schemas for all inbound body/query requests
* **Job Scheduler:** node-cron (for background low stock checks)
* **Logger:** pino + pino-pretty for structured JSON-formatted application logs

### Database & Caching
* **Primary DB:** MongoDB Atlas (Mongoose ODM 7)
* **Cache Layer:** Upstash Redis (REST client for rate limits and dashboard analytics caching)

---

## 🏗️ Architecture Design

```
                     ┌───────────────────────┐
                     │   Vite + React SPA    │
                     └───────────┬───────────┘
                                 │ HTTP / WebSockets
                                 ▼
                     ┌───────────────────────┐
                     │ Express API Server    │
                     └───────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MongoDB Atlas  │     │  Upstash Redis  │     │   Gemini API    │
│  (Tenant Data)  │     │ (Response Cache)│     │  (AI Summaries) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
* Node.js v20+
* MongoDB Atlas cluster
* Upstash Redis database
* Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/insightops-saas.git
   cd insightops-saas
   ```

2. **Configure Backend Environment:**
   Create a `backend/.env` file:
   ```env
   PORT=10000
   MONGODB_URI=mongodb+srv://...
   REDIS_URL=https://...
   REDIS_TOKEN=...
   JWT_SECRET=your_32_character_jwt_secret_key
   AI_API_KEY=your_gemini_api_key
   FRONTEND_URL=http://localhost:3000
   ```

3. **Configure Frontend Environment:**
   Create a `frontend/.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:10000/api/v1
   ```

4. **Install & Run Services (Locally):**

   * **Backend:**
     ```bash
     cd backend
     npm install
     npm run dev
     ```
   * **Frontend:**
     ```bash
     cd ../frontend
     npm install
     npm run dev
     ```

---

## 🔐 Security & Validation Policies
1. **Tenancy:** The `requireRole` and tenant validation middleware intercept all API calls to reject headers matching invalid memberships.
2. **Read-Only Sandboxing:** Natural language queries processed by the AI Assistant are validated by a schema parser that rejects non-SELECT/non-aggregation queries, preventing SQL-injection equivalents on NoSQL.
3. **Breach Detection:** The JWT helper rotates refresh tokens. If a token is reused, all active tokens for that user session are automatically revoked.
