import express from 'express';
import cors from 'cors';
import { router as publicoRouter } from './routes/publico';
import { adminRouter } from './routes/admin';
import { sessionMiddleware } from './lib/session';

const app = express();

app.use(cors());
app.use(express.json());
app.use(sessionMiddleware);
app.use('/api', publicoRouter);
app.use('/api/admin', adminRouter);

export { app };

// Only listen when run directly (not imported by tests)
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
