import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import '@/types'; // Import NextAuth type extensions

// Check if Redis is configured
const isRedisConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Lazy load Redis
const getRedis = async () => {
  if (!isRedisConfigured()) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
};

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: number;
}

const USER_PREFIX = 'user:';
const USER_EMAIL_PREFIX = 'user_email:';

export type CreateUserResult =
  | { success: true; user: User }
  | { success: false; error: 'redis_not_configured' | 'user_exists' | 'unknown_error' };

export async function createUser(email: string, password: string): Promise<CreateUserResult> {
  const redis = await getRedis();
  if (!redis) {
    return { success: false, error: 'redis_not_configured' };
  }

  // Check if user exists
  const existingId = await redis.get<string>(`${USER_EMAIL_PREFIX}${email.toLowerCase()}`);
  if (existingId) {
    return { success: false, error: 'user_exists' };
  }

  const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const hashedPassword = await bcrypt.hash(password, 10);

  const user: User = {
    id,
    email: email.toLowerCase(),
    password: hashedPassword,
    createdAt: Date.now(),
  };

  await redis.set(`${USER_PREFIX}${id}`, user);
  await redis.set(`${USER_EMAIL_PREFIX}${email.toLowerCase()}`, id);

  return { success: true, user };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const userId = await redis.get<string>(`${USER_EMAIL_PREFIX}${email.toLowerCase()}`);
  if (!userId) return null;

  return redis.get<User>(`${USER_PREFIX}${userId}`);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email);
        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};
