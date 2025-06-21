# Chat App

A real-time chat application built with Next.js, WebSocket, MongoDB, and NextAuth.

## Features

- 🔐 User authentication with NextAuth.js
- 📧 Email verification with OTP
- 🔍 Google OAuth integration
- 💬 Real-time messaging with WebSocket
- 👥 Contact management
- 📁 File/document sharing
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **File Storage**: Cloudinary
- **Email**: Nodemailer with Gmail SMTP

## Prerequisites

- Node.js 18+ 
- MongoDB database
- Google OAuth credentials (optional)
- Gmail account for OTP (optional)
- Cloudinary account (optional)

## Environment Variables

Create a `.env.local` file in the root directory:

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

## Installation

1. Clone the repository:
```bash
git clone https://github.com/nilesh7757/chat-app.git
cd chat-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see above)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## WebSocket Server

The chat app requires a separate WebSocket server. See the [ws-server repository](https://github.com/nilesh7757/ws-chat) for setup instructions.

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Backend (Render)

1. Deploy the ws-server to Render
2. Update `NEXT_PUBLIC_WS_URL` to your Render WebSocket URL
3. Redeploy the frontend

## Project Structure

```
chat-app/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── signin/         # Sign in page
│   │   ├── signup/         # Sign up page
│   │   └── verify-email/   # Email verification
│   ├── lib/               # Utility functions
│   └── models/            # MongoDB models
├── public/                # Static files
└── package.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
