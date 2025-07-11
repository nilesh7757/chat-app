# 💬 Chat App

A real-time chat application built with **Next.js**, **WebSocket**, **MongoDB**, and **NextAuth** for secure and seamless communication.

---

## 🚀 Features

* 🔐 **User Authentication** with NextAuth.js
* 📧 **Email Verification** via OTP
* 🔍 **Google OAuth** Integration
* 💬 **Real-time Messaging** using WebSocket
* 👥 **Contact Management**
* 📁 **File/Document Sharing** via Cloudinary
* 🎨 **Modern UI** built with Tailwind CSS

---

## 🛠 Tech Stack

| Category         | Technology                                  |
| ---------------- | ------------------------------------------- |
| **Frontend**     | Next.js 14, React, TypeScript, Tailwind CSS |
| **Backend**      | Node.js, Express, WebSocket                 |
| **Database**     | MongoDB with Mongoose                       |
| **Auth**         | NextAuth.js (Email + Google OAuth)          |
| **File Storage** | Cloudinary                                  |
| **Email**        | Nodemailer with Gmail SMTP                  |

---

## 📦 Prerequisites

Before running the project, ensure you have:

* Node.js 18+
* A MongoDB database (MongoDB Atlas or local)
* Google OAuth credentials (optional)
* Gmail account for OTP verification (optional)
* Cloudinary account (optional)

---

## 📁 Environment Variables

Create a `.env.local` file in the root directory and add the following:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gmail SMTP for OTP (Optional)
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# Cloudinary (Optional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# WebSocket Server URL
NEXT_PUBLIC_WS_URL=ws://localhost:3001
# For production: wss://your-ws-server.onrender.com
```

---

## 📥 Installation

1. **Clone the repository:**

```bash
git clone https://github.com/nilesh7757/chat-app.git
cd chat-app
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables** (as shown above)

4. **Run the development server:**

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔌 WebSocket Server Setup

This project requires a separate WebSocket server.
Refer to the setup guide in the [ws-server repository](https://github.com/nilesh7757/ws-chat).

---

## 🚀 Deployment

### Frontend (Vercel)

1. Push your code to GitHub.
2. Connect the repository to [Vercel](https://vercel.com).
3. Add your environment variables in the Vercel dashboard.
4. Deploy your project.

### Backend WebSocket Server (Render)

1. Deploy the WebSocket server to [Render](https://render.com).
2. Update `NEXT_PUBLIC_WS_URL` to your Render WebSocket endpoint.
3. Redeploy the frontend (if needed).

---

## 🧱 Project Structure

```
chat-app/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/             # API routes
│   │   ├── dashboard/       # Dashboard pages
│   │   ├── signin/          # Sign-in page
│   │   ├── signup/          # Sign-up page
│   │   └── verify-email/    # Email verification page
│   ├── lib/                 # Utility functions
│   └── models/              # MongoDB models
├── public/                  # Static files
└── package.json
```

---

## 🤝 Contributing

We welcome contributions!
To contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Commit your changes.
4. Push to your fork.
5. Create a Pull Request.
