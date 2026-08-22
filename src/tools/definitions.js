import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * MCP Tool Declarations for JAR Decompiler MCP Server
 */

export const TOOL_DEFINITIONS = [
  {
    name: 'decompile_jar',
    description: 'Decompiles a Java .jar or .war file into a target directory and returns comprehensive decompilation analytics, tree output, and logs.',
    destructiveHint: true,
    inputSchema: z.object({
      jarPath: z.string().describe('Absolute or relative path to the Java .jar or .war file to decompile.'),
      outputDir: z.string().optional().describe('Optional output directory path for decompiled source files. Defaults to decompiled-output/<jar_name>_<timestamp>.'),
      decompilerPath: z.string().optional().describe('Optional explicit path to the decompiler binary or .jar (e.g., decompiler/cfr.jar). If omitted, automatically detects decompilers in decompiler/.'),
      decompilerType: z.enum(['auto', 'cfr', 'vineflower', 'fernflower', 'procyon', 'jadx', 'bytecode-viewer', 'generic']).optional().describe('Decompiler engine type. Defaults to "auto" which detects based on filename.'),
      extraArgs: z.array(z.string()).optional().describe('Optional additional command-line arguments to pass directly to the decompiler engine.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      outputDir: z.string().optional(),
      decompilationInfo: z.any().optional(),
      executionDetails: z.any().optional()
    }).passthrough()
  },
  {
    name: 'list_decompilers',
    description: 'Lists all Java decompiler files (.jar or executables) currently found in the decompiler folder.',
    readOnlyHint: true,
    idempotentHint: true,
    inputSchema: z.object({
      decompilerDir: z.string().optional().describe('Optional path to the decompiler folder. Defaults to the decompiler/ directory.')
    }),
    outputSchema: z.array(
      z.object({
        filename: z.string(),
        detectedType: z.string(),
        path: z.string(),
        sizeBytes: z.number()
      })
    )
  },
  {
    name: 'analyze_decompilation_output',
    description: 'Analyzes an existing directory containing decompiled source code to count Java files, detect decompilation warnings/errors, and produce a directory tree.',
    readOnlyHint: true,
    inputSchema: z.object({
      outputDir: z.string().describe('Path to the directory containing decompiled code.')
    }),
    outputSchema: z.object({
      summary: z.object({
        totalFiles: z.number(),
        javaFilesCount: z.number(),
        remainingClassFilesCount: z.number(),
        resourceFilesCount: z.number(),
        totalSizeFormatted: z.string(),
        decompilationWarningCount: z.number()
      }),
      warningsAndErrors: z.array(z.any()),
      directoryTree: z.string()
    }).passthrough()
  },
  {
    name: 'evaluate_and_mavenize_sources',
    description: 'Evaluates decompiled outputs (comparing AST structure, line count, compiler warning count), chooses the best candidate with minimal code loss, and structures it into a clean Maven project with pom.xml.',
    destructiveHint: true,
    inputSchema: z.object({
      outputsDir: z.string().describe('Path to the directory containing candidate decompiled output folders (e.g. outputs/).'),
      targetMavenDir: z.string().describe('Path to target directory where the chosen source will be mavenized (e.g. mavenized_merged_source/).'),
      groupId: z.string().optional().describe('Maven groupId. Defaults to org.apache.commons.'),
      artifactId: z.string().optional().describe('Maven artifactId. Defaults to commons-io.'),
      version: z.string().optional().describe('Maven artifact version. Defaults to 2.22.0.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      selectedCandidate: z.string(),
      targetMavenDir: z.string(),
      evaluations: z.array(z.any())
    }).passthrough()
  },
  {
    name: 'compile_maven_project',
    description: 'Compiles a Maven project using mvn clean compile, parses any compilation errors into a human-readable format, and writes the log file.',
    destructiveHint: true,
    inputSchema: z.object({
      projectDir: z.string().describe('Path to the mavenized project root directory.'),
      logPath: z.string().optional().describe('Optional path to write the formatted compilation error log file. Defaults to logs/merged_source_errors_log.txt.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      logPath: z.string(),
      errorCount: z.number(),
      errors: z.array(z.any()).optional()
    }).passthrough()
  },
  {
    name: 'compare_bytecode_and_analyze',
    description: 'Performs ASM bytecode analysis comparing the original JAR/WAR against the recompiled mavenized source, outputting percentage match, business context similarity, and variable readability scores into a text log.',
    readOnlyHint: true,
    inputSchema: z.object({
      originalJarPath: z.string().optional().describe('Path to the original JAR or WAR file. Defaults to targeted-jars/commons-io-2.22.0.jar.'),
      mavenDir: z.string().optional().describe('Path to the mavenized project directory. Defaults to mavenized_merged_source.'),
      logPath: z.string().optional().describe('Path to output comparison report file. Defaults to logs/bytecode_comparison.txt.'),
      asmJarPath: z.string().optional().describe('Path to ASM library JAR file. Defaults to asm-bytecode-analysis/asm-9.10.1.jar.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      logPath: z.string(),
      metrics: z.any().optional()
    }).passthrough()
  },
  {
    name: 'generate_ast_and_detect_obfuscation',
    description: 'Uses GumTree Spoon AST Diff to parse Java source files, generate AST representations, and detect obfuscated or synthetic variable names (e.g., var0, arg1, single-letter, closure captures).',
    readOnlyHint: true,
    inputSchema: z.object({
      sourceDir: z.string().optional().describe('Path to the Java source directory to analyze. Defaults to mavenized_merged_source/src/main/java.'),
      gumtreeJarPath: z.string().optional().describe('Path to the GumTree Spoon AST Diff JAR. Defaults to gumtree-ast-diff/gumtree-spoon-ast-diff-1.124.jar.'),
      logPath: z.string().optional().describe('Path to output the obfuscation detection report. Defaults to logs/ast_obfuscation_detection.txt.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      logPath: z.string(),
      totalFilesScanned: z.number().optional(),
      totalVariablesAnalyzed: z.number(),
      obfuscatedCount: z.number(),
      detectedObfuscations: z.array(z.any())
    }).passthrough()
  },
  {
    name: 'rename_obfuscated_variables',
    description: 'Copies mavenized source to final output directory, applies obfuscated variable renames with meaningful names, adds changelog comments to modified files, and generates a comprehensive rename log. NEVER modifies business logic.',
    destructiveHint: true,
    inputSchema: z.object({
      sourceDir: z.string().optional().describe('Path to the source mavenized project to copy from. Defaults to mavenized_merged_source.'),
      targetDir: z.string().optional().describe('Path to the target output directory. Defaults to mavenized_final_output.'),
      logPath: z.string().optional().describe('Path to output the rename changelog. Defaults to logs/variable_rename_changelog.txt.'),
      renames: z.array(
        z.object({
          file: z.string().describe('Relative path to the Java file from src/main/java'),
          oldName: z.string().describe('Current obfuscated variable name'),
          newName: z.string().describe('New meaningful variable name'),
          line: z.number().optional().describe('Optional line number where the variable is declared')
        })
      ).describe('Array of rename operations.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      totalFilesModified: z.number(),
      totalRenamesApplied: z.number(),
      logPath: z.string()
    }).passthrough()
  },
  {
    name: 'run_ast_deobfuscation_pipeline',
    description: 'Runs the complete end-to-end AST de-obfuscation pipeline: copies mavenized_merged_source to mavenized_final_output, compiles, parses AST via GumTree Spoon to find obfuscated vars/methods, applies context-aware renames without changing business logic, verifies compilation, re-scans AST, and outputs logs to logs/ast_renamed_variables_methods.txt.',
    destructiveHint: true,
    inputSchema: z.object({
      sourceDir: z.string().optional().describe('Path to source mavenized project directory. Defaults to mavenized_merged_source.'),
      targetDir: z.string().optional().describe('Path to target final output directory. Defaults to mavenized_final_output.'),
      gumtreeJarPath: z.string().optional().describe('Path to GumTree Spoon AST Diff JAR. Defaults to gumtree-ast-diff/gumtree-spoon-ast-diff-1.124.jar.'),
      logPath: z.string().optional().describe('Path to output the comprehensive AST rename report log. Defaults to logs/ast_renamed_variables_methods.txt.'),
      renames: z.array(
        z.object({
          file: z.string().describe('Relative path to Java file from src/main/java'),
          oldName: z.string().describe('Obfuscated variable/method name'),
          newName: z.string().describe('Meaningful replacement name'),
          line: z.number().optional().describe('Optional line number')
        })
      ).optional().describe('Optional custom rename entries array. If omitted, uses default AST-analyzed renames.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      logPath: z.string()
    }).passthrough()
  },
  {
    name: 'fallback_to_candidate_for_missing_logic',
    description: 'Generic post-compilation differential fallback. If ASM business logic similarity is below targetSimilarityThreshold (e.g. 98%), scans alternative decompiler outputs (e.g. CFR), performs differential file swapping, tests compilation, and retains swaps only if business logic parity improves.',
    destructiveHint: true,
    inputSchema: z.object({
      targetMavenDir: z.string().optional().describe('Path to target mavenized project directory. Defaults to mavenized_final_output.'),
      candidateDir: z.string().optional().describe('Path to fallback decompiler candidate output directory. Defaults to outputs/avalon-logkit-2.1_cfr.'),
      originalJarPath: z.string().optional().describe('Path to original target JAR file for ASM parity analysis. Defaults to targeted-jars/avalon-logkit-2.1.jar.'),
      targetSimilarityThreshold: z.number().optional().describe('Target Business Logic Similarity threshold percentage (e.g. 98.0). Fallback triggers if current similarity is below this value.'),
      logPath: z.string().optional().describe('Path to output the differential fallback report log. Defaults to logs/generic_logic_fallback_report.txt.')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      logPath: z.string()
    }).passthrough()
  }
];

// Map TOOL_DEFINITIONS to MCP standard format
export const TOOLS = TOOL_DEFINITIONS.map(tool => ({
  name: tool.name,
  description: tool.description,
  inputSchema: zodToJsonSchema(tool.inputSchema),
  ...(tool.readOnlyHint !== undefined && { readOnlyHint: tool.readOnlyHint }),
  ...(tool.destructiveHint !== undefined && { destructiveHint: tool.destructiveHint }),
  ...(tool.idempotentHint !== undefined && { idempotentHint: tool.idempotentHint }),
  ...(tool.openWorldHint !== undefined && { openWorldHint: tool.openWorldHint })
}));
