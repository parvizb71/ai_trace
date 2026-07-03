import { GraphRepository } from './services/graphRepository';
import { watchRepo } from './services/gitWatcher';
import { startServer } from './server';
import * as path from 'path';

async function main() {
  console.log('--- Code2Graph MVP Starting ---');

  const repoPath = process.cwd();
  const repository = new GraphRepository();

  try {
    // 1. Initialize Database
    console.log('Initializing database...');
    repository.init();

    // 2. Run initial scan
    console.log('Running initial git scan...');
    await watchRepo(repoPath, repository);

    // 3. Start Visualization Server
    console.log('Starting visualization server...');
    startServer(repository);

    // 4. Log current state
    const graph = repository.getGraph();
    console.log('\nCurrent Traceability Graph Status:');
    console.log(`Artifacts (Nodes): ${graph.artifacts.length}`);
    console.log(`Edges (Connections): ${graph.edges.length}`);
    
    if (graph.artifacts.length > 0) {
        console.log('\nSample Artifacts:');
        graph.artifacts.slice(0, 3).forEach(a => {
            console.log(`- [${a.type}] ${a.title} (${a.id})`);
        });
    }

    console.log('\n--- Code2Graph MVP Initialization Complete ---');
    console.log('Keep this process running to support Step 4 (Visualization).');

  } catch (error) {
    console.error('Failed to start Code2Graph:', error);
  }
}

main();
