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

### 4. Build Assets (Tailwind CSS)
Choose one of the following methods to compile the Tailwind CSS styles:

#### Option A: Python-only (Recommended - No Node.js required)
If you do not have Node.js or `npm` installed on your system, you can compile Tailwind CSS using our standalone Python build script. It will automatically download the official standalone Tailwind CLI executable and build the minified stylesheet:
```bash
python scripts/build_css.py
```

#### Option B: Node.js and npm
If you have Node.js and `npm` installed on your system:
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

## Email Notification & SMTP Configuration

The platform has integrated automated email notifications for several key events:
- **New Surveys**: Automatically emails all approved users when a new wellbeing survey is published.
- **Peer Recognition**: Emails the recipient when a coworker praises them.
- **Trending Posts**: Emails both the post's author and all approved employees when a post is engaged with (liked or commented on) by **3 or more unique users**.
- **Targeted Admin Emails**: Allows administrators to send custom updates to specific users from the User Directory page (/admin/users).

### Mock Mode (Local Development)
By default, if no SMTP environment variables are defined in `.env.local`, the application executes in a Mock/Development Mode. All emails are processed asynchronously and appended to `data/sent_emails.log` in JSON format. This allows you to verify the structure, recipient list, and HTML content of generated emails without needing an active SMTP server.

### Real Email Delivery Configuration
To enable actual email delivery, add your SMTP server variables to `.env.local`:

#### 1. Unauthenticated SMTP Relay / Local Mail Catchers (No Password or Auth Details)
If your SMTP server (e.g., a corporate relay, or local testing tools like MailHog/Mailpit) does not require a username or password, specify only the host, port, and sender email. Keep the authentication variables commented out or empty:
```ini
# SMTP Server Configuration without authentication
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@company.com
# SMTP_USER=
# SMTP_PASSWORD=
```

#### 2. Authenticated SMTP Server (e.g., Gmail)
If your SMTP server requires credentials, provide the user and password fields:
```ini
# SMTP Server Configuration with authentication
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM=your_gmail_address@gmail.com
```

*Note: Make sure to restart your FastAPI application server (`python app.py`) after updating `.env.local` for the variables to take effect.*

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
