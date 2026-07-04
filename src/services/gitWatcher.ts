import { simpleGit, SimpleGit } from 'simple-git';
import { analyzeDiff } from './llmExtractor.js';
import { GraphRepository } from './graphRepository.js';

export async function watchRepo(repoPath: string, repository: GraphRepository) {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    console.log(`Analyzing repo at: ${repoPath}`);
    
    // Check if it's a git repo
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.error('Error: Not a git repository');
      return;
    }

    // Get the latest commit
    const log = await git.log({ maxCount: 1 });
    if (log.all.length === 0) {
      console.log('No commits found in the repository.');
      return;
    }

    const latestCommit = log.all[0];
    console.log(`Processing latest commit: ${latestCommit.hash} - ${latestCommit.message}`);

    // Get the diff for the latest commit
    // Using show --pretty=format: to get only the diff content
    const diff = await git.show([latestCommit.hash]);

    // Analyze with LLM
    const analysis = await analyzeDiff(latestCommit.message, diff);

    console.log(`LLM extracted ${analysis.artifacts.length} artifacts and ${analysis.edges.length} edges.`);

    // Save to DB
    for (const artifact of analysis.artifacts) {
      repository.upsertArtifact(artifact);
    }

    for (const edge of analysis.edges) {
      repository.insertEdge(edge);
    }

    console.log('Graph updated successfully.');

  } catch (error) {
    console.error('Error in git watcher:', error);
  }
}
