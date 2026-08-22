#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';

import { TOOLS, TOOL_DEFINITIONS } from './tools/definitions.js';
import { PROMPTS, getPromptContent } from './prompts/definitions.js';
import { SERVER_NAME, SERVER_VERSION } from './config.js';
import {
  decompileJar,
  listAvailableDecompilers,
  analyzeOutputDirectory,
  evaluateAndMavenizeSources,
  compileMavenizedProject,
  compareBytecodeAndAnalyze,
  generateAstAndDetectObfuscation,
  renameObfuscatedVariables,
  runAstDeobfuscationPipeline,
  fallbackToCandidateForMissingLogic
} from './decompilerHandler.js';

// Create server instance with tools and prompts capabilities
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

/**
 * List available tools schema
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

/**
 * List available prompts schema
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

/**
 * Handle prompt retrieval
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return getPromptContent(name, args);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Invalid arguments for prompt '${name}': ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;

  try {
    const toolDef = TOOL_DEFINITIONS.find(t => t.name === name);
    if (!toolDef) {
      throw new Error(`Unknown tool requested: ${name}. Available tools: ${TOOL_DEFINITIONS.map(t => t.name).join(', ')}`);
    }

    // Validate inputs with Zod
    const args = toolDef.inputSchema.parse(rawArgs || {});

    let result;
    let textContent = '';

    if (name === 'decompile_jar') {
      result = await decompileJar(args);
      const formattedResponse = [
        `==================================================`,
        `          JAVA JAR DECOMPILATION REPORT          `,
        `==================================================`,
        `Input JAR          : ${result.inputJar.name} (${result.inputJar.path})`,
        `JAR Size           : ${(result.inputJar.sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        `Decompiler Used    : ${result.executionDetails.decompilerUsed} (Engine: ${result.executionDetails.decompilerType})`,
        `Output Directory   : ${result.outputDir}`,
        `Execution Status   : ${result.success ? 'SUCCESS' : 'FAILED (Exit Code ' + result.executionDetails.exitCode + ')'}`,
        `Time Elapsed       : ${result.executionDetails.durationFormatted}`,
        `Executed Command   : ${result.executionDetails.commandLine}`,
        ``,
        `--- DECOMPILATION SUMMARY ---`,
        `Total Files        : ${result.decompilationInfo?.summary?.totalFiles ?? 0}`,
        `Decompiled .java   : ${result.decompilationInfo?.summary?.javaFilesCount ?? 0}`,
        `Remaining .class   : ${result.decompilationInfo?.summary?.remainingClassFilesCount ?? 0}`,
        `Resource Files     : ${result.decompilationInfo?.summary?.resourceFilesCount ?? 0}`,
        `Total Output Size  : ${result.decompilationInfo?.summary?.totalSizeFormatted ?? '0 B'}`,
        `Decompile Warnings : ${result.decompilationInfo?.summary?.decompilationWarningCount ?? 0}`,
        ``,
        `--- DIRECTORY TREE PREVIEW ---`,
        `${result.decompilationInfo?.directoryTree ?? 'No tree available'}`,
        ``
      ];

      if (result.decompilationInfo?.warningsAndErrors?.length > 0) {
        formattedResponse.push(`--- DECOMPILATION ISSUES/WARNINGS (Top 10) ---`);
        result.decompilationInfo.warningsAndErrors.slice(0, 10).forEach(w => {
          formattedResponse.push(`[${w.file}:${w.line}] ${w.message}`);
        });
        formattedResponse.push(``);
      }

      if (result.logs?.stderr?.trim().length > 0) {
        formattedResponse.push(`--- DECOMPILER STDERR LOG ---`);
        formattedResponse.push(result.logs.stderr.trim().slice(-2000));
        formattedResponse.push(``);
      }
      textContent = formattedResponse.join('\n');
    }
    else if (name === 'list_decompilers') {
      const decompilers = listAvailableDecompilers(args.decompilerDir);
      result = decompilers;
      if (decompilers.length === 0) {
        textContent = 'No decompiler jars/binaries found in the decompiler directory. Please copy CFR, Vineflower, Fernflower, or Procyon jar files into the "decompiler/" directory.';
      } else {
        textContent = [
          `Found ${decompilers.length} decompiler(s):`,
          ...decompilers.map((d, i) => `${i + 1}. ${d.filename} (Type: ${d.detectedType}, Path: ${d.path}, Size: ${(d.sizeBytes / 1024 / 1024).toFixed(2)} MB)`)
        ].join('\n');
      }
    }
    else if (name === 'analyze_decompilation_output') {
      result = analyzeOutputDirectory(args.outputDir);
      textContent = `Analysis of directory: ${args.outputDir} complete.`;
    }
    else if (name === 'evaluate_and_mavenize_sources') {
      result = evaluateAndMavenizeSources(args);
      textContent = `Mavenization complete. Selected candidate: ${result.selectedCandidate}`;
    }
    else if (name === 'compile_maven_project') {
      result = await compileMavenizedProject(args);
      textContent = `Compilation finished. Errors: ${result.errorCount}. Logs at: ${result.logPath}`;
    }
    else if (name === 'compare_bytecode_and_analyze') {
      result = await compareBytecodeAndAnalyze(args);
      textContent = `Bytecode comparison complete. Report at: ${result.logPath}`;
    }
    else if (name === 'generate_ast_and_detect_obfuscation') {
      result = generateAstAndDetectObfuscation(args);
      textContent = `AST detection complete. Obfuscated variables found: ${result.obfuscatedCount}`;
    }
    else if (name === 'rename_obfuscated_variables') {
      result = renameObfuscatedVariables(args);
      textContent = `Variables renamed successfully. Total renamed: ${result.totalRenamesApplied}`;
    }
    else if (name === 'run_ast_deobfuscation_pipeline') {
      result = await runAstDeobfuscationPipeline(args);
      textContent = `End-to-end AST pipeline complete. Log available at: ${result.logPath}`;
    }
    else if (name === 'fallback_to_candidate_for_missing_logic') {
      result = await fallbackToCandidateForMissingLogic(args);
      textContent = `Generic differential logic fallback complete. Log available at: ${result.logPath}`;
    }

    // Validate outbound result against schema
    const safeResult = toolDef.outputSchema.parse(result);

    return {
      content: [
        {
          type: 'text',
          text: textContent
        },
        {
          type: 'text',
          text: `\n### Structured Result Data\n\`\`\`json\n${JSON.stringify(safeResult, null, 2)}\n\`\`\``
        }
      ]
    };
  } catch (error) {
    let errorMessage = error.message;
    let suggestions = '';

    if (error instanceof ZodError) {
      errorMessage = 'Input validation failed: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      suggestions = `\nPlease ensure your tool arguments perfectly match the tool's schema.`;
    } else if (error.code === 'ENOENT') {
      errorMessage = `File or directory not found: ${error.path}`;
      suggestions = `\nPlease check if the file path is correct or if the necessary tools are installed.`;
    } else {
      suggestions = `\nPlease verify your inputs or check the server logs for more details.`;
    }

    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing tool '${name}': ${errorMessage}${suggestions}`
        }
      ]
    };
  }
});

/**
 * Start the MCP server using Stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JAR Decompiler MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
