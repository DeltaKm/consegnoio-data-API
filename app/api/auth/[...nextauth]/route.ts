
import NextAuth from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { User, Session } from 'next-auth';
import { string } from 'zod';


interface GogleAddressComponent {
  formamtedAddres: String
  placeId: String
  lat: String
  long: String
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string
      username?: string
    }
  }
  
  interface User {
    id: string
    username?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    username?: string
  }
}

export const authOptions = { 
  providers: [
   
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }): Promise<JWT> {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.username = user.username
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (token?.id) {
        session.user.id = token.id
      }
      if (token?.email) {
        session.user.email = token.email
      }
      if (token?.username) {
        session.user.username = token.username
      }
      return session
    }
  },  
}