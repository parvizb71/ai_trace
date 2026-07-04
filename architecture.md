Act as an expert Node.js/TypeScript architect. I am building an MVP for a developer tool called "Code2Graph". 

Paradigm: Unlike traditional AI tools that generate code from specs, this tool extracts a traceability graph directly from the developer's Git commits. It runs in the background, analyzes Git Diffs, uses a cheap LLM to infer intent, and updates a local graph database.

## Step 1
Tech Stack:
- Runtime: Node.js with TypeScript
- Git Integration: simple-git
- Database: better-sqlite3 (Local, zero-config, fast)
- LLM SDK: OpenAI SDK (configured for cheap models like GPT-4o-mini)

Task 1: Define the Core Data Models.
Create a file `src/types.ts`. I need strict TypeScript interfaces for:
1. `GraphArtifact`: Represents a node. Types can be: 'Feature', 'Task', 'Bugfix', 'Refactor', 'File'. It must have an id, type, title, description, related file paths, and timestamps.
2. `GraphEdge`: Represents a connection. Types can be: 'IMPLEMENTS', 'DEPENDS_ON', 'FIXES', 'MODIFIES'. 
3. `GitCommitAnalysis`: The structured output we expect from the LLM. It must contain an array of inferred Artifacts and Edges based on a diff.

Task 2: Define the Database Schema.
Create a file `src/db/schema.sql` with CREATE TABLE statements for Artifacts and Edges. Ensure indexes on file paths for fast lookups.

Output only the code for these two files with clear comments. Do not write implementation logic yet.


## Step 2
Now, let's build the LLM Context Compiler and Extraction Engine. Read the types from `src/types.ts`.

Create a file `src/services/llmExtractor.ts`.

This service must export an async function `analyzeDiff(commitMessage: string, diff: string): Promise<GitCommitAnalysis>`.

CRITICAL REQUIREMENT: You must write the System Prompt that will be sent to the LLM. The prompt must enforce strict JSON output. The LLM should act as a "Senior Software Architect analyzing a git diff to build a traceability graph". 
The prompt must instruct the LLM to:
1. Identify what logical feature/task this diff belongs to (even if not explicitly stated in the commit message).
2. Identify dependencies between changed files and existing conceptual features.
3. Return ONLY valid JSON matching the `GitCommitAnalysis` interface.
4. If the diff is trivial (e.g., formatting), return empty arrays.

Implement the function using the OpenAI API (use `gpt-4o-mini`) with customizable base url. Parse the response and validate it against the types. If parsing fails, return a safe empty state. Use Zod for runtime validation if necessary.

## Step 3
Now, let's build the Git listener and the Database updater.

1. Create `src/services/graphRepository.ts`:
Implement a class that wraps `better-sqlite3`. It needs methods to:
- `init()`: Run the schema.sql to create tables.
- `upsertArtifact(artifact: GraphArtifact)`: Insert or update a node.
- `insertEdge(edge: GraphEdge)`: Insert an edge, ignoring duplicates.
- `getGraph()`: Fetch all artifacts and edges for visualization.

2. Create `src/services/gitWatcher.ts`:
Implement a function `watchRepo(repoPath: string)`.
- Use `simple-git` to get the latest commit and its diff.
- Pass the commit message and diff to `llmExtractor.analyzeDiff()`.
- Take the result and save it using `graphRepository`.
- For now, just process the latest commit on startup. We will add real-time watching later.

3. Create `src/index.ts`:
Initialize the DB, and run the watcher on the current directory (`process.cwd()`). Add basic console.log statements to show the extracted artifacts and edges.

## Step 4
Finally, let's build a minimal visualization layer to prove the concept.

1. Create `src/server.ts`:
Set up a minimal Express.js server.
- Endpoint `GET /api/graph`: Returns the JSON data from `graphRepository.getGraph()`.
- Endpoint `GET /`: Serves a static HTML file.

2. Create `public/index.html`:
Write a single, self-contained HTML file (include CSS and JS inside it). 
- Fetch data from `/api/graph`.
- Use a lightweight, CDN-hosted graph visualization library like **Vis.js** or **D3.js** (Vis.js is easier and faster for MVP).
- Render the artifacts as nodes and edges as links. 
- Make nodes clickable to show the details (title, description, files).

Ensure the Express server starts alongside the git watcher in `src/index.ts`. The developer should be able to run `npm start`, make a commit, refresh the browser, and see their code changes reflected as a structured traceability graph.


## Step 5
Act as an expert Node.js/TypeScript developer. I need to add a database reset feature to my CLI tool to make testing easier.

Current stack: Node.js, TypeScript, better-sqlite3.

Task 1: Update Database Repository (`src/services/graphRepository.ts`)
Add a new method called `resetDatabase()`. This method should run `DROP TABLE IF EXISTS` for both Artifacts and Edges tables, and then re-run the schema creation to start completely fresh.

Task 2: Update the CLI entry point (`src/index.ts`)
Add simple command-line argument parsing using native `process.argv` (do NOT use external libraries like commander or yargs).
- If the user runs the app with the `--reset` flag (e.g., `npm start -- --reset`), the app should call `resetDatabase()` before starting the Git watcher.
- Log a clear message like "Database reset successful. Starting fresh..." to the console.
- If `--reset` is not provided, start normally without destroying data.

Output only the updated code for these two files with clear comments.

## Step 6
We need to upgrade how physical "File" artifacts are managed to handle the "Death and Birth" of file identities. A file path is not an identity.

Task 1: Update Data Models (`src/types.ts`)
- Add a new Edge type: `EVOLVED_INTO`. This edge connects an old File node to a new File node when the file is completely replaced.

Task 2: Update Git Watcher (`src/services/gitWatcher.ts`)
When fetching the diff, also extract the Git status for each changed file (Added 'A', Modified 'M', Deleted 'D', Renamed 'R'). Pass this status information along with the file path to the repository layer.

Task 3: Update Database Logic (`src/services/graphRepository.ts`)
Implement smart file upsert logic based on Git status:
1. If status is 'M' (Modified): Find the existing File node by filePath. If it exists, just update its `updatedAt` timestamp. Do NOT create a new node.
2. If status is 'A' (Added): Create a new File node.
3. If status is 'D' (Deleted): Find the existing File node by filePath. Mark it as deleted (e.g., add a `status: 'deleted'` property or similar).
4. If status is 'R' (Renamed): Find the old File node. Create a new File node for the new path. Create an `EVOLVED_INTO` edge from the old node to the new node. Update the old node's status to deleted.

This ensures that tasks linked to the old file remain historically accurate, while new tasks link to the new file identity.

Output the updated code for these three files.


## Step 7
Now, we are upgrading the graph data model to the "Task as Nexus" architecture. Tasks will act as the bridge between Features (Conceptual) and Files (Physical).

Task 1: Update Data Models (`src/types.ts`)
- Update `GraphArtifact` type enum to include: 'Feature', 'Task', 'File'.
- Update `GraphEdge` type enum to include: 'HAS_TASK' (Feature -> Task), 'MODIFIES' (Task -> File).
- Update `GitCommitAnalysis` interface. The LLM must now extract an array of Features, an array of Tasks, and the modified Files.

Task 2: Update Database Schema (`src/db/schema.sql`)
Ensure the schema supports the new artifact types and edge types efficiently. 

Task 3: Update LLM Extraction Engine (`src/services/llmExtractor.ts`)
Modify the System Prompt inside the `analyzeDiff` function heavily. Instruct the LLM explicitly with the following rules:
"You are analyzing a Git Diff to build a Traceability Graph based on the 'Task as Nexus' pattern. You must extract:
1. Feature: The high-level business goal or epic this work belongs to (infer from commit message or context. e.g., 'User Authentication'). If unsure, use 'General Maintenance'.
2. Task: The specific, small unit of work done in this commit (e.g., 'Add password validation').
3. File: The physical files modified.
You MUST create edges linking Feature --(HAS_TASK)--> Task --(MODIFIES)--> File. Return strictly valid JSON matching the updated GitCommitAnalysis interface."

Task 4: Update Repository (`src/services/graphRepository.ts`)
Create a method to save the Nexus structure: Upsert the Feature, upsert the Task, upsert the Files, and ensure the HAS_TASK and MODIFIES edges are created correctly between them.

Output the updated code for the relevant files.