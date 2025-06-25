import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";
import { compare } from "bcryptjs";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./mongoClient";
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        console.log('Authorize called with:', credentials);
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing email or password');
          return null;
        }
        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        console.log('User found:', user);
        if (user && user.password) {
          const isMatch = await compare(credentials.password, user.password);
          console.log('Password match:', isMatch);
          if (isMatch) {
            const userObj = user.toObject();
            delete userObj.password;
            console.log('Returning user:', userObj);
            return userObj;
          }
        }
        console.log('Authorization failed');
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.email && session.user) {
        // Fetch fresh user data from database
        await connectDB();
        const user = await User.findOne({ email: token.email });
        if (user) {
          (session.user as { id?: string }).id = user._id.toString();
          session.user.email = user.email;
          session.user.name = user.name;
          session.user.image = user.image;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
