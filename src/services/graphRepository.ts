import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphArtifact, GraphEdge } from '../types';

export class GraphRepository {
  private db: Database.Database;

  constructor(dbPath: string = 'code2graph.db') {
    this.db = new Database(dbPath);
  }

  /**
   * Initializes the database using the schema.sql file.
   */
  init() {
    const schemaPath = join(__dirname, '../db/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    this.db.exec(schema);
  }

  /**
   * Inserts or updates an artifact.
   */
  upsertArtifact(artifact: GraphArtifact) {
    const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, type, title, description, file_paths, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        title = excluded.title,
        description = excluded.description,
        file_paths = excluded.file_paths,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      artifact.id,
      artifact.type,
      artifact.title,
      artifact.description,
      JSON.stringify(artifact.filePaths),
      artifact.updatedAt || new Date().toISOString()
    );
  }

  /**
   * Inserts an edge, ignoring duplicates.
   */
  insertEdge(edge: GraphEdge) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO edges (from_id, to_id, type)
      VALUES (?, ?, ?)
    `);

    stmt.run(edge.fromId, edge.toId, edge.type);
  }

  /**
   * Fetches the entire graph for visualization.
   */
  getGraph() {
    const artifacts = this.db.prepare('SELECT * FROM artifacts').all() as any[];
    const edges = this.db.prepare('SELECT * FROM edges').all() as GraphEdge[];

    return {
      artifacts: artifacts.map(a => ({
        ...a,
        filePaths: JSON.parse(a.file_paths || '[]'),
        createdAt: a.created_at,
        updatedAt: a.updated_at
      })),
      edges
    };
  }
}
