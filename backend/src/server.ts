import app from './app';

// Render define PORT, en local usamos 3001
const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SCMVP backend listening on port ${PORT}`);
});
