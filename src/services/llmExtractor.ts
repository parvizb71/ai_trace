import OpenAI from 'openai';
import { z } from 'zod';
import { GitCommitAnalysis, ArtifactType, EdgeType } from '../types';

// Runtime validation schema matching the interfaces in src/types.ts
const ArtifactSchema = z.object({
  id: z.string(),
  type: z.enum(['Feature', 'Task', 'Bugfix', 'Refactor', 'File']),
  title: z.string(),
  description: z.string(),
  filePaths: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const EdgeSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  type: z.enum(['IMPLEMENTS', 'DEPENDS_ON', 'FIXES', 'MODIFIES']),
});

const AnalysisSchema = z.object({
  artifacts: z.array(ArtifactSchema),
  edges: z.array(EdgeSchema),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fhXjE791G0DSZWtl47L60150HPmQDSb7GzwDsDHFr6XVyVoj',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.gapgpt.app/v1',
});

/**
 * Analyzes a git diff using GPT-4o-mini to extract a traceability graph.
 */
export async function analyzeDiff(commitMessage: string, diff: string): Promise<GitCommitAnalysis> {
  const systemPrompt = `
    You are a Senior Software Architect analyzing a git diff to build a traceability graph for a tool called "Code2Graph".
    
    Your task is to:
    1. Identify logical features, tasks, or bugfixes the diff belongs to, even if not explicitly named.
    2. Identify dependencies or relationships between changed files and conceptual artifacts.
    3. Map code changes to specific files and relate them to higher-level artifacts.

    CRITICAL REQUIREMENTS:
    - Return ONLY valid JSON matching the schema provided.
    - No markdown formatting, no conversational text.
    - If the diff is trivial (formatting, whitespace, typos), return empty arrays for artifacts and edges.
    - Artifact types must be: 'Feature', 'Task', 'Bugfix', 'Refactor', 'File'.
    - Edge types must be: 'IMPLEMENTS', 'DEPENDS_ON', 'FIXES', 'MODIFIES'.

    JSON Structure:
    {
      "artifacts": [
        { "id": "uuid", "type": "Feature|Task|...", "title": "...", "description": "...", "filePaths": ["..."], "createdAt": "ISO-Timestamp", "updatedAt": "ISO-Timestamp" }
      ],
      "edges": [
        { "fromId": "id1", "toId": "id2", "type": "IMPLEMENTS|..." }
      ]
    }
  `;

  const userPrompt = `
    Commit Message: ${commitMessage}
    
    Git Diff:
    ${diff}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LLM');

    const parsed = JSON.parse(content);
    
    // Validate with Zod
    const validated = AnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      console.error('LLM Output Validation Failed:', validated.error.format());
      return { artifacts: [], edges: [] };
    }

    return validated.data as GitCommitAnalysis;

  } catch (error) {
    console.error('Error analyzing diff:', error);
    return { artifacts: [], edges: [] };
  }
}
