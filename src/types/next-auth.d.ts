// types/next-auth.d.ts
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      name: string;
      role: string;
      isActive: boolean;
    };
  }

  interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    isActive: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: string;
    isActive: boolean;
  }
}
