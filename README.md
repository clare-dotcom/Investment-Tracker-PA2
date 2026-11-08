# Investment Purchase Tracker PA2
# Investment Purchase Tracker with Secure Backend

## Project Overview

This project is a full-stack web application for tracking investment purchases. Users can create accounts, log in, and maintain their own purchase history. Each purchase includes an investment name, category, quantity, and unit price.

The application calculates the total value of each purchase and the overall amount invested. Purchase records are stored in a SQLite database, so the information remains available after refreshing the page or restarting the server.

## Technologies Used

- **Frontend:** HTML, CSS, and JavaScript
- **Backend:** Node.js and Express
- **Database:** SQLite
- **API:** REST-style HTTP endpoints
- **Testing:** Node.js automated tests and manual browser testing

I used a relational database because the application has clearly defined relationships between users, investment categories, and purchases. SQLite is also suitable for a small application because it does not require a separate database server.

## Main Features

### User Accounts

Users can register and log in with their own credentials. Passwords are stored using secure password hashing rather than plaintext.

Authentication determines whether a user is logged in, while authorization determines which records that user is allowed to access. Both are necessary because being logged in should not give someone access to another user's purchases.

### Purchase Management

Authenticated users can:

- Add investment purchases.
- View their purchase history.
- Edit existing purchases.
- Delete purchases.
- See calculated purchase values and the total amount invested.

Each purchase belongs to the user who created it. The backend uses the authenticated session to determine ownership rather than trusting a user ID supplied by the browser.

### Input Validation

The backend validates investment names, quantities, prices, and categories before saving purchases.

Quantity must be a whole number within the permitted range, and prices must be valid positive integer amounts in cents. Invalid requests are rejected without changing the database.

Server-side validation is important because browser-side checks can be bypassed by sending requests directly to the API.

## Application Structure

The project separates the frontend, backend, database schema, and validation logic.

- `public/` contains the browser interface.
- `server.js` handles the Express application and API routes.
- `security.js` contains security-related functionality.
- `validation.js` handles input validation.
- `validation.test.js` contains automated validation tests.
- `schema.sql` defines the database structure.
- `package.json` defines dependencies and npm scripts.
- `package-lock.json` records the dependency versions.
- `.env.example` provides an example of the required environment configuration.
- `test-report.md` documents the testing results.
- `screenshots/` contains testing evidence.

## How the Application Works

When a user adds a purchase, JavaScript collects the form values and sends an HTTP request to the Express backend.

The backend checks the user's session, validates the CSRF token and purchase information, and then saves the purchase to SQLite.

The database assigns an identifier to the new record. The backend returns a JSON response, and the frontend updates the purchase history and calculated totals.

The frontend uses asynchronous JavaScript with `async` and `await` to communicate with the server without requiring a full page reload after every operation.

The main HTTP methods are:

- **GET:** Retrieve purchase information.
- **POST:** Create a new purchase.
- **PUT:** Update an existing purchase.
- **DELETE:** Remove a purchase.

## Database Design

The database uses separate tables for users, categories, and purchases.

Primary keys uniquely identify records, while foreign keys establish relationships between tables. A purchase is associated with a user and an investment category.

Database constraints provide another layer of protection against invalid information.

I chose this structure instead of storing all purchases in one large JSON object because relational tables make it easier to enforce relationships, maintain data consistency, and query individual records.

## Security Considerations

The application includes several security measures:

**Password protection:** Passwords are hashed rather than stored directly.

**Session authentication:** Protected purchase operations require a logged-in user.

**Authorization:** Database operations are restricted to purchases belonging to the authenticated user.

**CSRF protection:** Requests that modify data require a valid CSRF token.

**SQL injection prevention:** Database queries use bound parameters instead of constructing SQL statements from user input.

**Safe text rendering:** Investment names are displayed as text rather than interpreted as HTML.

**Environment variables:** Sensitive configuration values are stored separately from the source code.

These measures help protect user accounts and purchase information, although additional security controls would be needed before deploying the application as a production financial service.

## Installation and Setup

### Requirements

- Node.js and npm
- A terminal and web browser

### Setup Instructions

1. Open the project folder in a terminal.
2. Install the dependencies:

   `npm ci`

3. Create a `.env` file using `.env.example` as a reference.
4. Configure the required environment variables, including a strong session secret.
5. Start the application:

   `npm start`

6. Open `http://localhost:3000` in a browser.

The application creates or initializes its local SQLite database as needed.

The `.env` file and local database are excluded from version control because they may contain sensitive configuration information or user data.

## Testing

I tested the application using automated tests and manual browser checks.

To run the automated tests:

`npm test`

The automated validation suite passed all five tests.

Manual testing covered registration, login, purchase creation, editing, deletion, database persistence, account isolation, invalid inputs, safe HTML rendering, and connection errors.

I also tested API requests directly to verify that unauthorized operations were rejected and that the server returned JSON error messages.

The detailed results are recorded in `test-report.md`, with screenshots included as supporting evidence.

## Limitations and Possible Improvements

This application is designed for local development and coursework rather than production deployment.

Possible future improvements include password recovery, more detailed investment reporting, and deployment with additional production security controls.

The current version focuses on reliable CRUD operations, persistent storage, account separation, and secure backend validation.

## Conclusion

This project helped me understand how the frontend, backend, and database work together in a full-stack application.

One important lesson was that checking user input in the browser is not enough. The server must independently validate requests and enforce record ownership.

Implementing authentication, CSRF protection, database constraints, and error handling also demonstrated how security affects the entire application rather than just the login process.