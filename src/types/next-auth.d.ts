// src/types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      name: string;
    };
  }

  interface User {
    id: string;
    username: string;
    role: string;
    name: string;
  }
}