# Tarjetas – Flashcard Study App

A full-stack web application for creating and studying flashcard decks with statistics tracking.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS |
| Database | SQLite (via SQLAlchemy ORM) |
| Auth | JWT (JSON Web Tokens) |
| Frontend | React 18, React Router v6, Axios, TailwindCSS |
| Deployment | Docker & Docker Compose |

---

## Project Structure

```
tarjetas/
├── backend/
│   ├── app.py              # Flask app factory
│   ├── config.py           # Configuration (reads from env vars)
│   ├── models.py           # SQLAlchemy models
│   ├── database.py         # db instance re-export
│   ├── run.py              # Entry point (python backend/run.py)
│   ├── routes/
│   │   ├── auth.py         # POST /api/auth/register, /api/auth/login
│   │   ├── decks.py        # CRUD /api/decks + CSV import
│   │   ├── cards.py        # PUT/DELETE /api/cards/<id>
│   │   └── statistics.py   # GET /api/statistics, POST /api/statistics/cards/<id>
│   ├── utils/
│   │   └── csv_importer.py # CSV → cards bulk import
│   └── Dockerfile          # Backend container
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── App.js          # React Router setup + protected routes
│   │   ├── index.js
│   │   ├── components/
│   │   │   ├── Auth/       # Login, Register
│   │   │   ├── Dashboard/  # Overview + recent decks
│   │   │   ├── Decks/      # DeckList, DeckDetail
│   │   │   ├── Cards/      # CardViewer (flip), CardForm, CSVImporter
│   │   │   └── Statistics/ # Overall + per-deck stats
│   │   ├── services/api.js # Axios instance with JWT interceptor
│   │   └── styles/tailwind.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile          # Frontend container
├── docker-compose.yml      # Multi-container setup
├── requirements.txt        # Python dependencies
├── package.json           # Root package metadata
├── .env.example           # Environment variables template
└── README.md
```

---

## 🚀 Setup & Running

### Option 1: Docker (Recommended) ⭐

The easiest way to get started with all services running together.

**Prerequisites:**
- Docker & Docker Compose installed

**Steps:**

1. Clone the repository:
```bash
git clone https://github.com/jezlo/tarjetas.git
cd tarjetas
```

2. Create `.env` file from template:
```bash
cp .env.example .env
```

3. Build and start containers:
```bash
docker-compose up --build
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: `db_data` volume (persistent storage)

**Useful Docker commands:**
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Remove all data (including database)
docker-compose down -v
```

---

### Option 2: Manual Setup

If you prefer to run services locally without Docker.

#### Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# (Optional) copy and edit env vars
cp .env.example .env

# Run the Flask dev server on port 5000
python backend/run.py
```

#### Frontend

```bash
cd frontend
npm install
npm start   # runs on http://localhost:3000, proxies /api → localhost:5000
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `dev-secret-key-change-in-production` | Flask secret key |
| `JWT_SECRET_KEY` | `dev-jwt-secret-change-in-production` | JWT signing key |
| `DATABASE_URI` | `sqlite:///tarjetas.db` (manual) or `sqlite:////app/data/tarjetas.db` (Docker) | SQLAlchemy database URI |
| `FLASK_ENV` | `development` | Flask environment mode |
| `REACT_APP_REGISTRATION_ENABLED` | `true` | Allow public registration (set to `false` for production) |

---

## 📡 API Reference

### Auth
| Method | URL | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{username, email, password}` | Register → returns `access_token` |
| POST | `/api/auth/login` | `{username, password}` | Login → returns `access_token` |

### Decks (JWT required)
| Method | URL | Description |
|---|---|---|
| GET | `/api/decks` | List user's decks |
| POST | `/api/decks` | Create deck `{name, description}` |
| GET | `/api/decks/<id>` | Get deck with cards |
| PUT | `/api/decks/<id>` | Update deck |
| DELETE | `/api/decks/<id>` | Delete deck |
| GET | `/api/decks/<id>/cards` | List cards |
| POST | `/api/decks/<id>/cards` | Create card `{question, answer}` |
| POST | `/api/decks/<id>/import` | Import CSV file (multipart/form-data) |

### Cards (JWT required)
| Method | URL | Description |
|---|---|---|
| PUT | `/api/cards/<id>` | Update card `{question?, answer?}` |
| DELETE | `/api/cards/<id>` | Delete card |

### Statistics (JWT required)
| Method | URL | Description |
|---|---|---|
| GET | `/api/statistics` | Overall user statistics |
| GET | `/api/statistics/decks/<id>` | Per-deck statistics |
| POST | `/api/statistics/cards/<id>` | Record result `{correct: true/false}` |

---

## 📊 CSV Import Format

The CSV file must have `question` and `answer` columns (case-insensitive). An optional `context` column can be included to store additional information such as examples, explanations, or alternative answers.

**Without context (existing format – still supported):**
```csv
question,answer
What is the capital of France?,Paris
What is 2 + 2?,4
```

**With context:**
```csv
question,answer,context
"What is the capital of France?","Paris","Largest city in France, known for the Eiffel Tower"
"What is 2 + 2?","4","Basic arithmetic"
```

**Mixed (some rows with context, some without):**
```csv
question,answer,context
"What is the capital of France?","Paris","Largest city"
Simple question,Simple answer,
```

---

## 🔐 Security Notes

- Always change `SECRET_KEY` and `JWT_SECRET_KEY` in production
- Use a proper database (PostgreSQL, MySQL) instead of SQLite in production
- Set `REACT_APP_REGISTRATION_ENABLED=false` in production to control user access
- Use HTTPS in production
- Store sensitive values in a secure secret manager

---

## 📝 License

See [LICENSE](LICENSE) file for details.