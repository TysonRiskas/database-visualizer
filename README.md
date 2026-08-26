# UVU Glass Box Database Internals Visualizer

An interactive educational sandbox designed for database students at Utah Valley University to explore, visualize, and understand how relational database engines work under the hood.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

---

## 🌟 Key Features

1. **Welcome Orientation & Safe Sandbox**:
   - Clear pathway selection between visualizing an active database engine and building a database from scratch.
2. **Engine Room Visualizer**:
   - **Multi-Table SQL JOINs**: Watch worker robots grab Foreign Key tokens (`FK 🔑`) to unlock parent rows via Primary Keys (`PK`).
   - **Strict Two-Phase Locking (2PL)**: Visualize exclusive locks, lock acquisitions, and concurrency wait queues.
   - **Interactive ACID Demos**: Trigger transaction rollbacks, constraint checks, and Write-Ahead Log (WAL) durability flushes.
3. **Build Your Own Database (Architect Studio)**:
   - **Granular SQL Syntax Training**: Interactive line-by-line syntax anatomy without pre-filled answers.
   - **Custom Schema Freedom**: Create any custom entities (Courses, Products, Dogs, Doctors) with dynamic live syntax verification.
   - **Live Physical Table Construction**: Watch the Wolverine Architect Robot construct table frames, stamp schema columns, and wire relational conduits.
4. **Relational Theory Guide**:
   - In-depth pedagogical reference covering Relational Cardinality (`1:1`, `1:M`, `M:M`), 2PL Concurrency, and ACID properties.

---

## ☁️ Running in GitHub Codespaces (One-Click)

You can run this application entirely in your browser using GitHub Codespaces:

1. Click the green **`<> Code`** button at the top of the GitHub repository.
2. Select the **Codespaces** tab.
3. Click **"Create codespace on main"**.
4. In the Codespaces terminal, run:
   ```bash
   npm run dev
   ```
5. Codespaces will automatically detect port `3000` and open a preview window in your browser!

---

## 💻 Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### Setup Steps
```bash
# 1. Clone the repository
git clone https://github.com/TysonRiskas/database-visualizer.git

# 2. Navigate to the project directory
cd database-visualizer

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

The application will be running at **`http://localhost:3000`**.

### Build for Production
```bash
npm run build
```

---

## 🎓 Technology Stack
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite 5
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
