import app from './app';

const PORT = Number(process.env.PORT) || 3001;

// Render requiere 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SCMVP backend listening on port ${PORT}`);
});
