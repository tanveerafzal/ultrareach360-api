# Ultrareach360 API

RESTful API for Ultrareach360 platform integration.

## Features

- Partner-based authentication
- JWT token generation
- User validation with partner verification
- API access control

## Prerequisites

- Node.js 20.11.0 or higher
- MongoDB Atlas account
- Same database as ultrareach360 main application

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your configuration:
```
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=same-secret-as-ultrareach360-app
```

**Important:** Use the same `MONGODB_URI` and `JWT_SECRET` as the main ultrareach360 application to share the user database and ensure token compatibility.

## Running the Application

### Development mode (port 3001):
```bash
npm run dev
```

### Production build:
```bash
npm run build
npm start
```

The API will be available at: `http://localhost:3001`

## API Endpoints

### POST /v1/auth/login

Authenticate a user with partner verification.

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "user-password",
  "partner": "partner@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "plan": "professional",
    "role": "user",
    "partner": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Partner Company",
      "email": "partner@example.com"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request:** Missing required fields
- **401 Unauthorized:** Invalid credentials or invalid partner
- **403 Forbidden:** API access not approved
- **500 Internal Server Error:** Server error

## Authentication Flow

1. User provides username (email), password, and partner email
2. System validates that the partner exists and has role="partner"
3. System validates that the user exists and belongs to the specified partner
4. System verifies the password
5. System checks if user has API access approved (apiAccess.status = "approved")
6. System generates JWT token with 7-day expiration
7. Returns token and user information

## Requirements for Users

To successfully authenticate via this API, users must:

1. Be registered in the ultrareach360 database
2. Have a valid partnerId assigned
3. Have API access status set to "approved"
4. Provide correct credentials and partner email

## Token Usage

The returned JWT token can be used for authenticated requests to other API endpoints by including it in the Authorization header:

```
Authorization: Bearer <token>
```

The token contains the following payload:
- `userId`: User's database ID
- `email`: User's email
- `partnerId`: Partner's database ID
- `role`: User's role (admin/partner/user)
- `plan`: User's subscription plan

## Security Notes

- All passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- API access must be explicitly approved by an admin
- Users can only authenticate through their assigned partner
- All API responses use consistent error format

## Development

The API is built with:
- Next.js 16 (App Router)
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing

## License

ISC
