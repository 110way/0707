# Employee Wellbeing Platform (FastAPI version)

This is a web application designed to foster a healthy corporate workspace. It allows employees to complete wellbeing check-ins, discuss feedback on an open forum, report concerns anonymously, praise peers, and redeem reward points for professional development opportunities.

---

## Technical Stack
- **Backend**: FastAPI (Python 3.8+)
- **Frontend**: Jinja2 HTML templates, Alpine.js, Tailwind CSS (for custom utility classes)
- **Database**: SQLite (local database stored under `data/app.db`)

---

## Node Modules & Dependencies

To compile the Tailwind CSS utilities and manage core client-side dependencies, this project uses npm. The following **Node modules** are required:

### Client-side libraries (copied to static files):
- **`alpinejs`**: A lightweight reactive JavaScript framework for dynamic UI components.
- **`chart.js`**: A graphing/charting library for visual analytics dashboards.
- **`lucide`**: An open-source vector icon set.

### Development dependencies:
- **`tailwindcss`**: Utility-first CSS builder used to compile `templates/tailwind_input.css` into `static/css/tailwind.css`.

---

## Steps to Run the Project in VS Code

Ensure you have **Python 3.8+** and **Node.js 22 LTS or newer** installed on your system.

### 1. Clone the Repository and Open in VS Code
Open the root directory of this repository in VS Code.

### 2. Set Up the Environment
Create a copy of the example environment variables file:
```bash
# In your terminal
cp .env.example .env.local
```
*(Verify that `JWT_SECRET` has a secure key and `DATABASE_PATH` points to `./data/app.db`)*

### 3. Install Python Dependencies
It is highly recommended to use a Python virtual environment:
```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (Command Prompt):
.venv\Scripts\activate
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install the Python packages
pip install -r requirements.txt
```

### 4. Install Node Dependencies and Build Assets
Run these commands to install the required Node packages and build the stylesheet/scripts:
```bash
# Install package.json dependencies
npm install

# Compile the Tailwind CSS styles and copy frontend JS libraries
npm run build
```

### 5. Running the Application
To launch the FastAPI development server:
```bash
python app.py
```
This runs the Uvicorn server on **`http://localhost:5000`**. You can open this link in your browser to view the application.

---

## Running Automated Tests
To run the project's unit tests:
```bash
python tests.py
```

---

## Default Credentials for Login
Password for all default accounts is: `Password123!`
- **Employee**: `rahul@company.com`
- **HR Representative**: `hr@company.com`
- **Administrator**: `admin@company.com`
