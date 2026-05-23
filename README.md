***📝 TodoSpace – FastAPI Fullstack Application***

Live Demo: [(https://anass-todoapp-fastapi.onrender.com)]
Tech Stack: Python, FastAPI, SQLAlchemy, Pydantic v2, PostgreSQL/SQLite, Jinja2, bootstrap js/css, Pytest, Alembic, Git

-------------------

***Description***

A task management application built with FastAPI. It demonstrates real-world backend development practices and clean architecture, including:

REST API design with GET, POST, PUT, DELETE endpoints

Data validation using Pydantic v2

Clean architecture principles and dependency injection

Modern async endpoints for high-performance, non-blocking operations

Authentication & Authorization with JWT, role-based access, and admin routes

Database integration with SQLite and PostgreSQL

Alembic migrations for database version control

Unit & integration testing using Pytest

Secure password hashing and validation policies

full-stack UI with Jinja templating for server-rendered pages

-------------------

***Features***

User registration, login, and JWT-based authentication

CRUD operations for todos (Create, Read, Update, Delete)

Async API endpoints for high-performance operations

Full-stack support with Jinja templates and bootstrap JS/CSS

Consistent RESTful response schemas and proper HTTP status codes

-------------------

***Future Improvements / Nice-to-Have***

Optional CSRF protection if using cookies for auth

Improve frontend UI/UX with modern JS framework (React / Tailwind)

-------------------


***📁 Project Structure***

```
FastAPI-FullStack-TodoApp/
│
├── TodoApp/                     # Main application package
│   ├── alembic/                 # Alembic migration environment
│   │   ├── versions/            # Auto-generated migration scripts
│   │   ├── env.py
│   │   ├── README
│   │   └── script.py.mako
│   │
│   ├── routers/                 # All API route files
│   │   ├── __init__.py
│   │   ├── admin.py             # Admin-only routes
│   │   ├── auth.py              # Authentication & JWT logic
│   │   ├── todos.py             # Todo CRUD endpoints
│   │   └── users.py             # User management endpoints
│   │
│   ├── static/                  # Static frontend assets
│   │   ├── css/
│   │   └── js/
│   │
│   ├── templates/               # Jinja2 HTML templates
│   │   ├── add-todo.html
│   │   ├── edit-todo.html
│   │   ├── home.html
│   │   ├── layout.html
│   │   ├── login.html
│   │   ├── navbar.html
│   │   ├── register.html
│   │   └── todo.html
│   │
│   ├── .idea/                   # IDE configs (should be gitignored)
│   ├── .venv/                   # Local virtual environment (should be gitignored)
│   └── .vscode/                 # VSCode settings
│
├── test/                        # Testing directory
│   ├── __init__.py
│   ├── alembic.ini
│   ├── database.py              # Test database setup
│   ├── main.py                  # Test FastAPI app loader
│   └── models.py                # Test database models
│
├── .gitignore
├── README.md                    # Project documentation
├── requirements.txt             # Python dependencies
├── test_main.http               # Manual API testing requests
├── testdb.db                    # SQLite test database
└── todosapp.db                  # SQLite database for local development

```



-------------------

***Contribution***

Contributions are welcome! Fork the repo, implement your changes, and submit a pull request.

-------------------

***License***

MIT License © [Anas Mohamed]
