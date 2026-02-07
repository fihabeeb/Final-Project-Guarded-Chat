import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',  // Your client URL
   methods: ['GET', 'POST']  // Your client URL
}));

app.get('/', (req,res) => {
   // res.sendFile(__dirname + '/index.html');
});

export default app;