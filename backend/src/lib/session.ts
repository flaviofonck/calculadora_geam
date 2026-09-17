import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

const PgStore = connectPgSimple(session);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required');
}

const isDev = process.env.NODE_ENV === 'development';

export const sessionMiddleware = session({
  store: new PgStore({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET,
  name: 'geam.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isDev,
    maxAge: 24 * 60 * 60 * 1000,
  },
});
