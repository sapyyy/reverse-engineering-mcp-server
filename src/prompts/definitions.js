import { z } from 'zod';
import { DIRS, LOG_PATHS } from '../config.js';

/**
 * MCP Prompt Declarations for JAR Decompiler MCP Server
 */

export const PROMPT_HANDLERS = {
  evaluate_and_mavenize_prompt: {
    description: 'Prompt instructions for comparing decompiled AST outputs, selecting the optimal codebase with minimal code loss, and mavenizing it.',
    arguments: [
      { name: 'outputsDir', description: 'Directory containing decompiled output variants (e.g., commons-io-cfr, commons-io-vineflower)', required: false },
      { name: 'targetMavenDir', description: 'Destination directory to store mavenized project (e.g., mavenized_merged_source)', required: false }
    ],
    schema: z.object({
      outputsDir: z.string().default(DIRS.OUTPUTS + '/'),
      targetMavenDir: z.string().default(DIRS.MAVENIZED_MERGED_SOURCE + '/')
    }),
    handler: (args) => ({
      description: 'System prompt for AST evaluation, code loss analysis, and Maven project structuring',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java reverse engineering and build automation assistant.

Your task:
1. Compare all candidate decompiled directories in '${args.outputsDir}' (e.g. CFR vs Vineflower vs Fernflower).
2. Evaluate AST structural completeness, line count, synthetic bytecode comments, and compilation error rates.
3. Select the candidate that exhibits minimal code loss, fewest compilation errors, and cleanest source fidelity.
4. Copy the winning candidate's Java sources into '${args.targetMavenDir}/src/main/java' and resources into '${args.targetMavenDir}/src/main/resources'.
5. Generate a complete, production-ready 'pom.xml' configured with Java 8/17 source compliance and requisite dependencies.`
          }
        }
      ]
    })
  },
  fix_compilation_errors_prompt: {
    description: 'Mandatory system prompt for fixing Java compilation errors without modifying business logic (syntax, generic, and type-cast fixes only).',
    arguments: [
      { name: 'logFile', description: 'Path to compilation error log file (e.g., logs/merged_source_errors_log.txt)', required: false },
      { name: 'projectDir', description: 'Path to project source directory (e.g., mavenized_merged_source)', required: false }
    ],
    schema: z.object({
      logFile: z.string().default(LOG_PATHS.MERGED_SOURCE_ERRORS),
      projectDir: z.string().default(DIRS.MAVENIZED_MERGED_SOURCE)
    }),
    handler: (args) => ({
      description: 'Strict System Rules for Repairing Java Compilation Errors Without Business Logic Alteration',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java compiler engineer tasked with fixing errors in '${args.projectDir}' reported in '${args.logFile}'.

STRICT RULES & CONSTRAINTS:
1. PRESERVE BUSINESS LOGIC: You must NEVER alter, remove, simplify, or refactor any functional business logic, public API methods, return values, or application flow.
2. SYNTAX & TYPE FIXES ONLY: You are strictly allowed to modify syntax errors, invalid lambda syntax, type casting mismatches, missing imports, synthetic bytecode artifacts, and generic type parameters.
3. CONTEXT & DEBUG PRESERVATION: Retain all comments, annotations, variable naming, and parameter signatures to preserve LocalVariableTable context when compiled with '-g -parameters'.
4. STEP-BY-STEP REPAIR: Read the errors from '${args.logFile}', inspect the targeted Java source files, apply precise syntax fixes, and re-run compilation until zero errors remain.`
          }
        }
      ]
    })
  },
  compare_bytecode_prompt: {
    description: 'System prompt for running ASM bytecode comparisons between the original JAR and recompiled mavenized project, calculating similarity metrics and debug readability scores.',
    arguments: [
      { name: 'originalJarPath', description: 'Path to original JAR or WAR file (targeted-jars/commons-io-2.22.0.jar)', required: false },
      { name: 'mavenDir', description: 'Path to mavenized project root (mavenized_merged_source)', required: false },
      { name: 'logPath', description: 'Output report file path (logs/bytecode_comparison.txt)', required: false }
    ],
    schema: z.object({
      originalJarPath: z.string().default('targeted-jars/commons-io-2.22.0.jar'),
      mavenDir: z.string().default(DIRS.MAVENIZED_MERGED_SOURCE),
      logPath: z.string().default(LOG_PATHS.BYTECODE_COMPARISON)
    }),
    handler: (args) => ({
      description: 'System Instructions for ASM Bytecode Comparison and Functional Equivalence Metrics',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java bytecode analyzer utilizing ASM and javap to perform deep binary analysis.

Your task:
1. Compare '${args.originalJarPath}' against the recompiled classes in '${args.mavenDir}/target/classes'.
2. Measure overall file/bytecode match percentage, business logic & context similarity, and variable readability scores.
3. Verify LocalVariableTable, LineNumberTable, and MethodParameters metadata.
4. Output the full structured human-readable comparison report into '${args.logPath}'.`
          }
        }
      ]
    })
  },
  rename_obfuscated_variables_prompt: {
    description: 'System prompt for AST-based detection and renaming of obfuscated/synthetic variable names in decompiled Java source, preserving all business logic.',
    arguments: [
      { name: 'sourceDir', description: 'Path to mavenized source directory (e.g., mavenized_merged_source)', required: false },
      { name: 'targetDir', description: 'Path to final output directory (e.g., mavenized_final_output)', required: false },
      { name: 'logPath', description: 'Path for the rename changelog log file (e.g., logs/variable_rename_changelog.txt)', required: false }
    ],
    schema: z.object({
      sourceDir: z.string().default(DIRS.MAVENIZED_MERGED_SOURCE),
      targetDir: z.string().default(DIRS.MAVENIZED_FINAL_OUTPUT),
      logPath: z.string().default(LOG_PATHS.VARIABLE_RENAME_CHANGELOG)
    }),
    handler: (args) => ({
      description: 'System Instructions for AST-Based Obfuscated Variable Detection, Renaming, and Pipeline Verification',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java reverse engineering and code readability specialist.

Your task is to execute the complete AST-based de-obfuscation pipeline on decompiled Java source code:
1. Copy '${args.sourceDir}' to '${args.targetDir}'.
2. Compile '${args.targetDir}' to establish clean baseline.
3. Parse AST using GumTree Spoon ('gumtree-ast-diff/gumtree-spoon-ast-diff-1.124.jar') to scan for obfuscated variable and method names.
4. Apply context-aware renames for obfuscated variables/methods while strictly preserving 100% business logic.
5. Re-compile '${args.targetDir}' to confirm zero compilation errors.
6. Re-scan AST to verify 0 obfuscated variables remain.
7. Output complete changelog and verification log to '${args.logPath}'.

STRICT CONSTRAINTS:
- NEVER alter, remove, simplify, or refactor any functional business logic, public API signatures, return values, or control flow.
- Target only synthetic/obfuscated names (var0, var1, arg0, single-letter obfuscated identifiers).
- Ensure 100% build success and full verification report in '${args.logPath}'.`
          }
        }
      ]
    })
  },
  reverse_engineering_pipeline_prompt: {
    description: 'System prompt to execute the complete reverse engineering pipeline: dual decompilation (CFR/Vineflower), metric-based evaluation, mavenization, incremental compilation, and bytecode comparison.',
    arguments: [
      { name: 'jarPath', description: 'Path to the target JAR or WAR file', required: true },
      { name: 'cfrOutputDir', description: 'Output directory for CFR decompilation', required: false },
      { name: 'vineflowerOutputDir', description: 'Output directory for Vineflower decompilation', required: false },
      { name: 'mavenDir', description: 'Output directory for the mavenized project', required: false }
    ],
    schema: z.object({
      jarPath: z.string(),
      cfrOutputDir: z.string().default('outputs/cfr-output'),
      vineflowerOutputDir: z.string().default('outputs/vineflower-output'),
      mavenDir: z.string().default(DIRS.MAVENIZED_MERGED_SOURCE)
    }),
    handler: (args) => ({
      description: 'System Instructions for End-to-End Reverse Engineering Pipeline',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java reverse engineering assistant.

Your task is to execute the full end-to-end decompilation and verification pipeline on '${args.jarPath}':

1. DECOMPILE:
   - Use the 'decompile_jar' tool to decompile '${args.jarPath}' into '${args.cfrOutputDir}' using the 'cfr' engine.
   - Use the 'decompile_jar' tool to decompile '${args.jarPath}' into '${args.vineflowerOutputDir}' using the 'vineflower' engine.

2. EVALUATE & MAVENIZE:
   - Use the 'evaluate_and_mavenize_sources' tool to evaluate the outputs and structure the best one into a Maven project at '${args.mavenDir}'. (Use the parent directory of the outputs as 'outputsDir').

3. COMPILE & FIX:
   - Use the 'compile_maven_project' tool to compile '${args.mavenDir}'.
   - If there are compilation errors, incrementally fix them by preserving business logic (syntax/generic fixes only) and re-compiling until successful.

4. VERIFY:
   - Use the 'compare_bytecode_and_analyze' tool to test if the compiled mavenized source matches the original JAR.
   - Ensure the logs contain proper comments analyzing the similarity metrics and verification results.`
          }
        }
      ]
    })
  },
  ast_deobfuscation_pipeline_prompt: {
    description: 'Comprehensive prompt for copying source to final output, compiling, building GumTree Spoon AST, detecting obfuscated vars/methods, applying context-aware renames, verifying build, and writing log files.',
    arguments: [
      { name: 'sourceDir', description: 'Path to source mavenized directory (e.g., mavenized_merged_source)', required: false },
      { name: 'targetDir', description: 'Path to target final output directory (e.g., mavenized_final_output)', required: false },
      { name: 'logPath', description: 'Path to output log file (e.g., logs/ast_renamed_variables_methods.txt)', required: false }
    ],
    schema: z.object({
      sourceDir: z.string().default(DIRS.MAVENIZED_MERGED_SOURCE),
      targetDir: z.string().default(DIRS.MAVENIZED_FINAL_OUTPUT),
      logPath: z.string().default(LOG_PATHS.AST_RENAMED_VARIABLES)
    }),
    handler: (args) => ({
      description: 'System Instructions for AST-Based Obfuscated Variable Detection, Renaming, and Pipeline Verification',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java reverse engineering and code readability specialist.

Your task is to execute the complete AST-based de-obfuscation pipeline on decompiled Java source code:
1. Copy '${args.sourceDir}' to '${args.targetDir}'.
2. Compile '${args.targetDir}' to establish clean baseline.
3. Parse AST using GumTree Spoon ('gumtree-ast-diff/gumtree-spoon-ast-diff-1.124.jar') to scan for obfuscated variable and method names.
4. Apply context-aware renames for obfuscated variables/methods while strictly preserving 100% business logic.
5. Re-compile '${args.targetDir}' to confirm zero compilation errors.
6. Re-scan AST to verify 0 obfuscated variables remain.
7. Output complete changelog and verification log to '${args.logPath}'.

STRICT CONSTRAINTS:
- NEVER alter, remove, simplify, or refactor any functional business logic, public API signatures, return values, or control flow.
- Target only synthetic/obfuscated names (var0, var1, arg0, single-letter obfuscated identifiers).
- Ensure 100% build success and full verification report in '${args.logPath}'.`
          }
        }
      ]
    })
  }
};

export const PROMPTS = Object.keys(PROMPT_HANDLERS).map(name => ({
  name,
  description: PROMPT_HANDLERS[name].description,
  arguments: PROMPT_HANDLERS[name].arguments
}));

export function getPromptContent(name, rawArgs) {
  const promptDef = PROMPT_HANDLERS[name];
  if (!promptDef) {
    throw new Error(`Unknown prompt requested: ${name}. Available prompts: ${Object.keys(PROMPT_HANDLERS).join(', ')}`);
  }
  
  // Parse arguments securely using Zod, handling defaults
  const args = promptDef.schema.parse(rawArgs || {});
  return promptDef.handler(args);
}
