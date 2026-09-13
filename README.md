# 🚀 OpenStudy-AI

> **A modern full-stack AI-powered study platform built to make learning more organized, productive, and accessible.**

OpenStudy-AI is a full-stack educational web application that brings study organization and AI-assisted learning into one platform. The project combines a modern **React frontend** with a **Django REST Framework backend**, providing a structured foundation for authentication, notes, projects, study management, and AI-powered features.

---

## ✨ Features

* 🤖 **AI Study Assistant** — an interactive AI experience designed to support students while learning.
* 🔐 **JWT Authentication** — secure authentication and protected API access.
* 📝 **Notes** — create and manage study notes in one place.
* 📚 **Projects** — organize larger study tasks and learning projects.
* ⚡ **REST API** — structured communication between the React frontend and Django backend.
* 🎨 **Modern Interface** — clean, responsive UI focused on usability.
* 🗄️ **Database-backed Application** — persistent storage through Django's database layer.
* 🔧 **Full-Stack Architecture** — separate frontend and backend designed to work together.

---

## 🛠️ Tech Stack

### Frontend

* **React**
* **JavaScript**
* **HTML5**
* **CSS3**

### Backend

* **Python**
* **Django**
* **Django REST Framework**
* **Simple JWT**

### Development

* **Git & GitHub**
* **VS Code**
* **REST APIs**

---

## 🏗️ Architecture

OpenStudy-AI follows a modern client-server architecture:

```text
┌──────────────────────┐
│     React Frontend   │
│       UI / UX        │
└──────────┬───────────┘
           │
           │ REST API
           ▼
┌──────────────────────┐
│   Django REST API    │
│ Authentication       │
│ Business Logic       │
│ Serializers / Views  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       Database       │
│ Users / Notes / Data │
└──────────────────────┘
```

This separation keeps the frontend and backend modular and makes the application easier to extend.

---

## 📂 Project Structure

```text
OpenStudy-AI/
│
├── backend/
│   ├── api/
│   ├── backend/
│   ├── manage.py
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── README.md
└── ...
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have installed:

* Python 3.x
* Node.js
* npm
* Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/OpenStudy-AI.git
cd OpenStudy-AI
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run migrations:

```bash
python manage.py migrate
```

Start Django:

```bash
python manage.py runserver
```

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The application can then be accessed through the local development URL provided by the frontend development server.

---

## 🔐 Environment Variables

If your local configuration requires environment variables, create a `.env` file and provide the required values.

**Never commit API keys, passwords, tokens, or other private credentials to GitHub.**

A future `.env.example` file can be used to document the required variables without exposing secrets.

---

## 🧠 AI Assistant

The AI assistant is designed as part of the platform's learning experience rather than as a standalone chatbot.

The goal is to provide students with an accessible way to interact with AI while keeping study organization and learning resources within the same application.

> **Note:** AI functionality may require additional configuration depending on the environment in which the application is running.

---

## 🎯 Project Goals

OpenStudy-AI was created to explore how modern web technologies and AI can be combined to build a practical educational product.

The project focuses on:

* Full-stack application development
* REST API design
* Authentication and authorization
* Frontend/backend integration
* Database-driven applications
* Modern UI development
* AI-assisted learning experiences

---

## 📈 Future Improvements

OpenStudy-AI is designed to be expandable. Potential future improvements include:

* 📊 Study analytics and progress tracking
* 🧠 More advanced AI study tools
* 📅 Study planning and scheduling
* 🔔 Notifications and reminders
* 👥 Collaborative study features
* 📱 Improved mobile experience
* ☁️ Production deployment
* 🧪 Expanded automated testing

---

## 💡 Why This Project?

OpenStudy-AI represents a step beyond individual coding exercises into building a complete application with a frontend, backend, database, authentication, APIs, and AI-focused functionality.

It was built as a practical full-stack project with the goal of developing skills that transfer directly to real-world software development.

---

## 👨‍💻 Project

**OpenStudy-AI**
A full-stack educational platform focused on combining **AI + productivity + modern web development**.

**Built with:** React • Django • Python • Django REST Framework • JWT

---

## ⭐ If You Like the Project

If OpenStudy-AI is useful or interesting to you, consider giving the repository a ⭐ on GitHub.

---

> **OpenStudy-AI — Study smarter. Build better. Learn more.**
