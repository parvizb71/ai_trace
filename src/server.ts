import express from 'express';
import path from 'path';
import { GraphRepository } from './services/graphRepository';

export function startServer(repository: GraphRepository, port: number = 3000) {
  const app = express();

  // Serve static files from the 'public' directory
  app.use(express.static(path.join(__dirname, '../public')));

  // API Endpoint: Get the full graph
  app.get('/api/graph', (req, res) => {
    try {
      const graph = repository.getGraph();
      res.json(graph);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch graph' });
    }
  });

  app.listen(port, () => {
    console.log(`\nVisualization server running at: http://localhost:${port}`);
    console.log(`Graph API available at: http://localhost:${port}/api/graph`);
  });

  return app;
}
