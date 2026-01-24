import app from './modules';

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`🚀 Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
