// src/index.ts
import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// 示例路由
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from TypeScript API!' });
});

app.get('/users', (req: Request, res: Response) => {
  res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});