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