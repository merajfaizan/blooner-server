# Blooner Server

## Overview

Blooner Server is the backend for the Blooner Blood Donation website. It handles authentication, user management, donation requests, blogs, and other essential functionalities. This server is built using Express.js and interacts with MongoDB for data storage.

### Technologies Used

- **Express.js:** Backend framework for building server-side applications.
- **MongoDB:** NoSQL database for storing user and donation data.
- **JWT (JSON Web Token):** Used for user authentication and authorization.

## Installation and Usage

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/merajfaizan/blooner-server.git
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:** <br/>
   Create a .env file in the root directory for server-side configurations.

   ```bash
   PORT=5000
   DB_USER=your-mongodb-username
   DB_PASS=your-mongodb-password
   ACCESS_TOKEN_SECRET=your-jwt-secret
   ```

4. **Start the Server**

   ```bash
   npm start
   ```

   The server will be running at http://localhost:5000 by default.

# API Endpoints

## Authentication

- **POST /jwt:** Generate a JWT token for authentication.

## User Management

- **GET /users/:email:** Get user information by email.
- **GET /users:** Get all user information (admin and volunteer only).
- **PUT /users/:id/toggle-status:** Toggle user status (active/blocked) (admin only).
- **PUT /users/:id/toggle-role:** Toggle user role (donor/volunteer/admin) (admin only).
- **GET /find-donors:** Get donors based on blood group, district, and upazila.
- **GET /donors:** Get all donors.
- **PUT /users:** Update user information.

## Donation Requests

- **GET /donation-requests:** Get donation requests of logged-in user.
- **GET /donation-request-count:** Get total donation request count (admin and volunteer only).
- **GET /admin/donation-requests:** Get all donation requests (admin and volunteer only).
- **POST /donationRequests:** Save a new donation request.
- **GET /donationRequests/:id:** Get donation request details by ID.
- **PUT /donationRequests/:id:** Update donation request details for donor assignment.
- **PUT /donation-requests/:id/update-status:** Change donation request status.
- **DELETE /donation-requests/:id/delete:** Delete a donation request.

## Blogs

- **GET /blogs/all:** Get all blogs (public).
- **GET /blogs/:id:** Get a blog by ID (public).
- **GET /blogs:** Get blogs based on status (admin and volunteer only).
- **POST /blogs:** Add a new blog (admin and volunteer only).
- **PUT /blogs/:blogId:** Update blog status to draft or publish (admin only).
- **DELETE /blogs/:blogId:** Delete a blog by ID (admin only).

## Miscellaneous

- **GET /pending-requests:** Get all pending donation requests.

## Contact

For inquiries and support, contact us at [merajfzn@gmail.com](mailto:merajfzn@gmail.com).
