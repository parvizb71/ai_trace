/**
 * Represents a node in the traceability graph.
 */
export type ArtifactType = 'Feature' | 'Task' | 'Bugfix' | 'Refactor' | 'File';

export interface GraphArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  description: string;
  /**
   * List of file paths associated with this artifact.
   * Useful for mapping code changes to logical features.
   */
  filePaths: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a directed connection between two artifacts.
 */
export type EdgeType = 'IMPLEMENTS' | 'DEPENDS_ON' | 'FIXES' | 'MODIFIES';

export interface GraphEdge {
  fromId: string;
  toId: string;
  type: EdgeType;
}

/**
 * Structured output from the LLM after analyzing a git diff.
 */
export interface GitCommitAnalysis {
  artifacts: GraphArtifact[];
  edges: GraphEdge[];
}
