-- Table for Graph Artifacts (Nodes)
CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('Feature', 'Task', 'Bugfix', 'Refactor', 'File')),
    title TEXT NOT NULL,
    description TEXT,
    file_paths TEXT, -- JSON array of file paths
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for Graph Edges (Connections)
CREATE TABLE IF NOT EXISTS edges (
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IMPLEMENTS', 'DEPENDS_ON', 'FIXES', 'MODIFIES')),
    PRIMARY KEY (from_id, to_id, type),
    FOREIGN KEY (from_id) REFERENCES artifacts (id) ON DELETE CASCADE,
    FOREIGN KEY (to_id) REFERENCES artifacts (id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
-- Using a simple index on file_paths text. 
-- In better-sqlite3 we can use JSON functions if needed for more complex queries.
CREATE INDEX IF NOT EXISTS idx_artifacts_file_paths ON artifacts(file_paths);
