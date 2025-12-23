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
    id: string;
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
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() {
        const result = await createGuestUser();

        if (!result || !result.length) {
          // ❗ prevents CallbackRouteError
          return null;
        }

        const guestUser = result[0];

        if (!guestUser?.id) {
          return null;
        }

        return {
          ...guestUser,
          type: "guest",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
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
