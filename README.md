# ExamNotes AI

ExamNotes AI is an advanced, production-grade AI-powered study aid and document utility platform. Designed specifically for students and educators, it allows users to effortlessly upload academic documents, extract and generate comprehensive AI study notes, compile structured flowchart diagrams, build complete presentation slides, and perform professional PDF operations—all integrated with a robust billing and subscription credit management system.

---

## 🚀 Key Features

* **📚 AI Notes Generation:** Upload academic source files and automatically generate high-retention, detailed study notes and exam summaries powered by the Gemini 2.5 Flash API.
* **📊 AI Diagram Generator:** Convert textual explanations, workflows, or architectural designs into elegant visual flowcharts and mindmaps compiled via Mermaid.js CLI.
* **🎥 AI Presentation Generator:** Transform study topics or text notes into complete, professionally structured slide decks (`.pptx` downloads) instantly.
* **🔄 PDF to Word Conversion:** Extract layout and textual structures from standard PDF files and recompile them into editable Microsoft Word documents (`.docx`).
* **🔗 Merge PDF:** Combine multiple disjointed PDF booklets, reports, or chapters into a single consolidated PDF document.
* **✂️ Split PDF:** Extract precise page ranges from massive textbooks or slide handouts into smaller, focused PDF files.
* **💳 Billing System & Credit Management:** Full integration with Stripe checkout packages and real-time subscription models to purchase and consume operational credits.

---

## 🛠️ Technology Stack

### Frontend
* **Core:** React 19, TypeScript
* **Build Tool:** Vite 8
* **Styling & UI:** Tailwind CSS, Framer Motion, Base UI, Lucide Icons

### Backend
* **Runtime:** Node.js (v18+)
* **Framework:** Express.js 5 (TypeScript compiled)
* **Database:** MongoDB & Mongoose ORM
* **Authentication:** Firebase Admin SDK (JWT state-level verification)

### Integrations
* **Generative AI:** Google Gemini 2.5 Flash API
* **Payments:** Stripe API (Checkout & Webhooks)
* **Diagram Compiler:** Mermaid.js CLI (`mmdc` via Puppeteer headless rendering)
* **Document Processing:** `pdf-lib` (PDF manipulation), `mammoth` (Docx handling), `pptxgenjs` (PPT generation), and `archiver` (zipping).

---

## 📁 Project Structure

```text
ai-exam-notes-generator/
├── frontend/                  # React + Vite Frontend SPA
│   ├── public/                # Static public assets
│   ├── src/                   # React Application Source
│   │   ├── assets/            # Fonts, media, stylesheets
│   │   ├── components/        # Shared presentation widgets
│   │   ├── lib/               # Client-side configuration (API axios client)
│   │   ├── pages/             # Dashboard, Billing, Notes, Doc Tools pages
│   │   └── main.tsx           # Application entry point
│   ├── .env.example           # Client configuration template
│   ├── package.json           # Frontend dependency specs
│   └── tsconfig.json          # Frontend TypeScript compiler settings
│
├── backend/                   # Node.js + Express API Backend
│   ├── config/                # Server settings and database connections
│   ├── middleware/            # JWT Token verification, Rate limiters
│   ├── models/                # MongoDB schemas (User, Note, SplitHistory, etc.)
│   ├── routes/                # Route definitions & controller logic
│   ├── uploads/               # Local temp folder for processing documents (ignored in Git)
│   ├── .env.example           # API keys and secret keys config template
│   ├── package.json           # Backend dependency specs
│   └── tsconfig.json          # Backend TypeScript compiler settings
│
├── README.md                  # Comprehensive project documentation
├── LICENSE                    # MIT License certificate
├── CHANGELOG.md               # Change log ledger
└── .gitignore                 # Top-level global git rules
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory with the following variables:
* `PORT`: The local server port (default `5000`).
* `MONGO_URI`: The MongoDB connection string (e.g. `mongodb+srv://...` or `mongodb://localhost:27017/examnotes`).
* `FIREBASE_PROJECT_ID`: The project identifier from your Firebase Developer Console.
* `FIREBASE_CLIENT_EMAIL`: The Google Cloud service account client email.
* `FIREBASE_PRIVATE_KEY`: The base64 or PEM encoded Firebase Admin private key.
* `GEMINI_API_KEY`: Google Generative AI Developer key for executing Gemini 2.5 models.
* `STRIPE_SECRET_KEY`: Active API private key from your Stripe account.
* `STRIPE_WEBHOOK_SECRET`: Signing secret generated when pointing the Stripe CLI webhook listener to `/api/billing/webhook`.

### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend/` directory with the following variables:
* `VITE_FIREBASE_API_KEY`: Client-side Firebase key.
* `VITE_FIREBASE_AUTH_DOMAIN`: Firebase auth URL.
* `VITE_FIREBASE_PROJECT_ID`: Firebase project identifier.
* `VITE_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket location.
* `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender key.
* `VITE_FIREBASE_APP_ID`: Client application identification.
* `VITE_API_URL`: Path to your backend endpoints (default: `http://localhost:5000/api`).

---

## 🚀 Installation & Local Startup

### 1. Prerequisite Requirements
Ensure you have **Node.js (v18.0.0 or higher)** and **MongoDB** installed and running on your local machine.

### 2. Backend Setup
1. Navigate into the backend workspace:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the local configuration file:
   ```bash
   cp .env.example .env
   ```
   *(Open `.env` and fill in your MongoDB connection details, Firebase Admin SDK secrets, Gemini key, and Stripe variables.)*
4. Run the server in development mode:
   ```bash
   npm run dev
   ```
   *The server starts by default on `http://localhost:5000`.*

### 3. Frontend Setup
1. Navigate into the frontend workspace:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the local configuration file:
   ```bash
   cp .env.example .env
   ```
   *(Open `.env` and fill in your Firebase public API credentials.)*
4. Run the application locally:
   ```bash
   npm run dev
   ```
   *The website starts by default on `http://localhost:5173`.*

---

## 📦 Deployment Instructions

### Backend Production Build
1. Transpile TypeScript into production-ready ES5 JavaScript:
   ```bash
   npm run build
   ```
2. Launch the server in production mode:
   ```bash
   npm start
   ```

### Frontend Production Build
1. Compile the React bundle:
   ```bash
   npm run build
   ```
2. Preview the production compilation locally:
   ```bash
   npm run preview
   ```
3. Host the compiled `/dist` directory contents on any premium static site hosting service (Vercel, Netlify, AWS S3, or Firebase Hosting).

---

## 📝 License

This project is licensed under the terms of the [MIT License](file:///d:/New%20folder/ai-exam-notes-generator/LICENSE).
