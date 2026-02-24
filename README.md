# Felicity - Event Management Platform

The Platform is a comprehensive event management system designed for campus clubs and students. It facilitates event creation, registration, team management, and realtime communication.

## Tech Stack & Justifications

### Frontend
- **React (v19)**: Component-based architecture for efficient rendering.
- **Vite**: Lightning-fast build tool and development server.
- **React Router Dom**: Declarative routing for the single page application.
- **React Hook Form & Zod**: Performant form management and schema based validation.
- **Axios**: Handles the connection between frontend and backend, managing security tokens automatically.
- **Socket.io-client**: Realtime bidirectional communication.
- **Fuse.js**: Lightweight fuzzy search for events and discovery.

### Hosting Guidelines

This project is configured for deployment on modern cloud platforms:

- **Frontend**: Deploy to **Vercel** or **Netlify**.
  - Set `VITE_API_URL` environment variable to your Backend API URL (e.g., `https://api.yourdomain.com/api`).
- **Backend**: Deploy to **Render**, **Railway**, or **Fly.io**.
  - Set `MONGO_URI` to your MongoDB Atlas connection string.
  - Set `CLIENT_URL` to your production Frontend URL.
  - Configure SMTP variables in `.env` for production email delivery.
- **Database**: Use **MongoDB Atlas** for a managed database instance.

*Refer to `deployment.txt` in the root directory for your specific production URLs.*

- **React Icons**: Versatile icon set for efficient UI.
- **React Hot Toast**: Responsive and customizable toast notifications.
- **Vanilla CSS**: Custom Pink Theme design system for full visual control.

### Backend
- **Node.js & Express**: Scalable runtime and framework for the REST API.
- **MongoDB & Mongoose**: Flexible NoSQL database with object modeling.
- **Socket.io**: Powers real time features like team chat and live feeds.
- **JSON Web Token (JWT)**: Secure, stateless authentication.
- **Bcryptjs**: Robust password hashing and security.
- **Multer**: Middleware for handling file uploads (payment proofs).
- **Nodemailer**: Email service integration for system notifications.
- **QR Code**: Generation of unique check-in codes for event tickets.
- **Dotenv**: Environment variable management.
- **Morgan & Express Validator**: Logging and request data validation.


## Advanced Features

### Tier A: Core Advanced Features
- **Hackathon Team Registration**: 
    - Support for team-based event registration where a team leader creates a team, sets the team size, and invites members via a unique code or sends a request. 
    - Registration is marked complete only when all invited members accept and the team is fully formed. 
    - Includes team management dashboard, invite tracking, and automatic ticket generation for all team members upon completion.
- **Merchandise Payment Approval Workflow**: 
    - A payment verification system for merchandise purchases where users upload a payment proof (image) for "Pending Approval" status.
    - Organizers can view and verify proofs, then approve or reject payments. 
    - On approval, stock is decremented, a ticket with QR is generated, and a confirmation email is sent. 

### Tier B: Real-time & Communication Features
- **Organizer Password Reset Workflow**: 
    - A controlled reset system where organizers request resets from the Admin with a reason. 
    - Admins review requests and provide comments/approvals. Upon approval, a new password is generated for the admin to share securely.
- **Real-time Team Chat**: 
    - A real-time chat system for hackathon teams to communicate within dedicated rooms.
    - Features include real-time message delivery, message history,message reactions, and the ability to share files/links within the team.

### Tier C: Integration & Enhancement Features
- **Anonymous Feedback System**: 
    - Allows participants to submit anonymous star ratings (1–5) and comments for attended events. 
    - Organizers can view aggregated ratings and filter feedback to improve future events.

## Design Choices & Technical Decisions

### Tier A: Core Advanced Features
- **Hackathon Team Registration**
    - **Design Choice**: Implemented a leader-led invitation model. This centralizes team management, ensuring a clear point of contact (the leader) and simplifying the verification process for full-team formation.
    - **Technical Decision**: Registration entries are only finalized and tickets generated when the team reaches its `maxSize` and is marked `complete`. This ensures that database records reflect committed participants rather than speculative invites.
- **Merchandise Payment Approval Workflow**
    - **Design Choice**: Decoupled purchase request from payment confirmation using a "Proof of Payment" submission. This accommodates manual payment methods (like UPI) common in campus environments.
    - **Technical Decision**: Implemented a state machine for registration status (`pending` -> `confirmed`). Stock is decremented only upon manual approval of payment for paid items, while free items decrement stock immediately to ensure real-time availability.

### Tier B: Real-time & Communication Features
- **Organizer Password Reset Workflow**
    - **Design Choice**: Adopted a "Human-in-the-loop" administration policy. Unlike student accounts, club (organizer) accounts require admin verification for resets to prevent unauthorized access to event management controls.
    - **Technical Decision**: The system generates a secure, random password only *after* admin approval, requiring the admin to be the trusted distributor of new credentials.
- **Real-time Team Chat**
    - **Design Choice**: Restricted chat rooms to 'complete' teams to foster a focused and secure collaborative environment once the team's commitment is finalized.
    - **Technical Decision**: Leveraged Socket.io combined with MongoDB persistence. This provides the low-latency interaction of WebSockets with the reliability of a historical message archive.

### Tier C: Integration & Enhancement Features
- **Anonymous Feedback System**
    - **Design Choice**: Strict anonymity by omitting personal identifiers from the organizer's view. This ensures student privacy and encourages honest, constructive feedback.
    - **Technical Decision**: Feedback is restricted to 'attended' or 'completed' events, ensuring that only verified participants can influence event ratings.

##  Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Running locally or on Atlas)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Assignment_1
```

### 2. Backend Configuration
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGO_URI=mongodb://localhost:21017/felicity
JWT_SECRET=your_super_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:5173
```
*Note: Ensure MongoDB is running before starting the server.*

Start the backend:
```bash
npm run dev
```

### 3. Frontend Configuration
Navigate to the `frontend` directory and install dependencies:
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

The application should now be running at `http://localhost:5173`.

---

##  Design Philosophy
Felicity follows a modern, dynamic design language emphasizing clarity and user engagement. The custom "Pink Theme" uses a curated palette of HSL-based colors, subtle micro-animations, and glassmorphism elements to provide a premium feel throughout the platform.
