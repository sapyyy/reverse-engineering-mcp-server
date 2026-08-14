#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOLS } from './tools/definitions.js';
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
  return getPromptContent(name, args);
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'decompile_jar') {
      const { jarPath, outputDir, decompilerPath, decompilerType, extraArgs } = args || {};

      if (!jarPath) {
        throw new Error('Missing required argument: jarPath');
      }

      const result = await decompileJar({
        jarPath,
        outputDir,
        decompilerPath,
        decompilerType,
        extraArgs
      });

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
        `Total Files        : ${result.decompilationInfo.summary.totalFiles}`,
        `Decompiled .java   : ${result.decompilationInfo.summary.javaFilesCount}`,
        `Remaining .class   : ${result.decompilationInfo.summary.remainingClassFilesCount}`,
        `Resource Files     : ${result.decompilationInfo.summary.resourceFilesCount}`,
        `Total Output Size  : ${result.decompilationInfo.summary.totalSizeFormatted}`,
        `Decompile Warnings : ${result.decompilationInfo.summary.decompilationWarningCount}`,
        ``,
        `--- DIRECTORY TREE PREVIEW ---`,
        `${result.decompilationInfo.directoryTree}`,
        ``
      ];

      if (result.decompilationInfo.warningsAndErrors && result.decompilationInfo.warningsAndErrors.length > 0) {
        formattedResponse.push(`--- DECOMPILATION ISSUES/WARNINGS (Top 10) ---`);
        result.decompilationInfo.warningsAndErrors.slice(0, 10).forEach(w => {
          formattedResponse.push(`[${w.file}:${w.line}] ${w.message}`);
        });
        formattedResponse.push(``);
      }

      if (result.logs.stderr && result.logs.stderr.trim().length > 0) {
        formattedResponse.push(`--- DECOMPILER STDERR LOG ---`);
        formattedResponse.push(result.logs.stderr.trim().slice(-2000));
        formattedResponse.push(``);
      }

      return {
        content: [
          {
            type: 'text',
            text: formattedResponse.join('\n')
          }
        ]
      };
    }

    if (name === 'list_decompilers') {
      const { decompilerDir } = args || {};
      const decompilers = listAvailableDecompilers(decompilerDir);

      if (decompilers.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No decompiler jars/binaries found in the decompiler directory. Please copy CFR, Vineflower, Fernflower, or Procyon jar files into the "decompiler/" directory.'
            }
          ]
        };
      }

      const lines = [
        `Found ${decompilers.length} decompiler(s):`,
        ...decompilers.map((d, i) => `${i + 1}. ${d.filename} (Type: ${d.detectedType}, Path: ${d.path}, Size: ${(d.sizeBytes / 1024 / 1024).toFixed(2)} MB)`)
      ];

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n')
          }
        ]
      };
    }

    if (name === 'analyze_decompilation_output') {
      const { outputDir } = args || {};
      if (!outputDir) {
        throw new Error('Missing required argument: outputDir');
      }

      const info = analyzeOutputDirectory(outputDir);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2)
          }
        ]
      };
    }

    if (name === 'evaluate_and_mavenize_sources') {
      const { outputsDir, targetMavenDir, groupId, artifactId, version } = args || {};
      if (!outputsDir || !targetMavenDir) {
        throw new Error('Missing required arguments: outputsDir and targetMavenDir');
      }

      const result = evaluateAndMavenizeSources({ outputsDir, targetMavenDir, groupId, artifactId, version });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    if (name === 'compile_maven_project') {
      const { projectDir, logPath } = args || {};
      if (!projectDir) {
        throw new Error('Missing required argument: projectDir');
      }

      const result = await compileMavenizedProject({ projectDir, logPath });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    if (name === 'compare_bytecode_and_analyze') {
      const { originalJarPath, mavenDir, logPath, asmJarPath } = args || {};
      const result = await compareBytecodeAndAnalyze({ originalJarPath, mavenDir, logPath, asmJarPath });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    if (name === 'generate_ast_and_detect_obfuscation') {
      const { sourceDir, gumtreeJarPath, logPath } = args || {};
      const result = generateAstAndDetectObfuscation({ sourceDir, gumtreeJarPath, logPath });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    if (name === 'rename_obfuscated_variables') {
      const { sourceDir, targetDir, logPath, renames } = args || {};
      if (!renames || !Array.isArray(renames)) {
        throw new Error('Missing required argument: renames (must be an array of {file, oldName, newName} objects)');
      }
      const result = renameObfuscatedVariables({ sourceDir, targetDir, logPath, renames });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    if (name === 'run_ast_deobfuscation_pipeline') {
      const { sourceDir, targetDir, gumtreeJarPath, logPath, renames } = args || {};
      const result = await runAstDeobfuscationPipeline({ sourceDir, targetDir, gumtreeJarPath, logPath, renames });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    if (name === 'fallback_to_candidate_for_missing_logic') {
      const { targetMavenDir, candidateDir, originalJarPath, targetSimilarityThreshold, logPath } = args || {};
      const result = await fallbackToCandidateForMissingLogic({ targetMavenDir, candidateDir, originalJarPath, targetSimilarityThreshold, logPath });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown tool requested: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing tool '${name}': ${error.message}`
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
