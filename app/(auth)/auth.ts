import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { createGuestUser, getUser } from "@/lib/db/queries";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,

  // ✅ REQUIRED
  session: {
    strategy: "jwt",
  },

  providers: [
    // -------- REGULAR LOGIN --------
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {},
      async authorize({ email, password }: any) {
        const isDemoMode = process.env.DEMO_MODE === "true";

        if (isDemoMode) {
          return {
            id: `demo-${Date.now()}`,
            email: email || "demo@tiqology.com",
            type: "regular",
          };
        }

        if (!email || !password) {
          return null;
        }

        const users = await getUser(email);
        if (!users.length) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;
        if (!user?.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) {
          return null;
        }

        return { ...user, type: "regular" };
      },
    }),

    // -------- GUEST LOGIN --------
    // -------- GUEST LOGIN --------
Credentials({
  id: "guest",
  name: "Guest",
  credentials: {},
  async authorize() {
    try {
      const result = await createGuestUser();

      // Absolute guarantee: never return null
      if (!result || !result.length || !result[0]?.id) {
        return {
          id: crypto.randomUUID(),
          email: null,
          type: "guest",
        };
      }

      return {
        id: result[0].id,
        email: result[0].email ?? null,
        type: "guest",
      };
    } catch (err) {
      console.error("createGuestUser failed:", err);

      // Fallback guest user (prevents CallbackRouteError)
      return {
        id: crypto.randomUUID(),
        email: null,
        type: "guest",
      };
    }
  },
}),


  callbacks: {
    async jwt({ token, user }) {
  if (user?.id) {
    token.id = user.id;
    token.type = user.type;
  }
  return token;
},


    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }
      return session;
    },
  },
});
