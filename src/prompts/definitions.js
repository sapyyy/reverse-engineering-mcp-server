/**
 * MCP Prompt Declarations for JAR Decompiler MCP Server
 */

export const PROMPTS = [
  {
    name: 'evaluate_and_mavenize_prompt',
    description: 'Prompt instructions for comparing decompiled AST outputs, selecting the optimal codebase with minimal code loss, and mavenizing it.',
    arguments: [
      {
        name: 'outputsDir',
        description: 'Directory containing decompiled output variants (e.g., commons-io-cfr, commons-io-vineflower)',
        required: true
      },
      {
        name: 'targetMavenDir',
        description: 'Destination directory to store mavenized project (e.g., mavenized_merged_source)',
        required: true
      }
    ]
  },
  {
    name: 'fix_compilation_errors_prompt',
    description: 'Mandatory system prompt for fixing Java compilation errors without modifying business logic (syntax, generic, and type-cast fixes only).',
    arguments: [
      {
        name: 'logFile',
        description: 'Path to compilation error log file (e.g., logs/merged_source_errors_log.txt)',
        required: true
      },
      {
        name: 'projectDir',
        description: 'Path to project source directory (e.g., mavenized_merged_source)',
        required: true
      }
    ]
  },
  {
    name: 'compare_bytecode_prompt',
    description: 'System prompt for running ASM bytecode comparisons between the original JAR and recompiled mavenized project, calculating similarity metrics and debug readability scores.',
    arguments: [
      {
        name: 'originalJarPath',
        description: 'Path to original JAR file (targeted-jars/commons-io-2.22.0.jar)',
        required: true
      },
      {
        name: 'mavenDir',
        description: 'Path to mavenized project root (mavenized_merged_source)',
        required: true
      },
      {
        name: 'logPath',
        description: 'Output report file path (logs/bytecode_comparision.txt)',
        required: true
      }
    ]
  },
  {
    name: 'rename_obfuscated_variables_prompt',
    description: 'System prompt for AST-based detection and renaming of obfuscated/synthetic variable names in decompiled Java source, preserving all business logic.',
    arguments: [
      {
        name: 'sourceDir',
        description: 'Path to mavenized source directory (e.g., mavenized_merged_source)',
        required: true
      },
      {
        name: 'targetDir',
        description: 'Path to final output directory (e.g., mavenized_final_output)',
        required: true
      },
      {
        name: 'logPath',
        description: 'Path for the rename changelog log file (e.g., logs/variable_rename_changelog.txt)',
        required: true
      }
    ]
  },
  {
    name: 'ast_deobfuscation_pipeline_prompt',
    description: 'Comprehensive prompt for copying source to final output, compiling, building GumTree Spoon AST, detecting obfuscated vars/methods, applying context-aware renames, verifying build, and writing log files.',
    arguments: [
      {
        name: 'sourceDir',
        description: 'Path to source mavenized directory (e.g., mavenized_merged_source)',
        required: false
      },
      {
        name: 'targetDir',
        description: 'Path to target final output directory (e.g., mavenized_final_output)',
        required: false
      },
      {
        name: 'logPath',
        description: 'Path to output log file (e.g., logs/ast_renamed_variables_methods.txt)',
        required: false
      }
    ]
  }
];

export function getPromptContent(name, args) {
  if (name === 'evaluate_and_mavenize_prompt') {
    const outputsDir = args?.outputsDir || 'outputs/';
    const targetMavenDir = args?.targetMavenDir || 'mavenized_merged_source/';

    return {
      description: 'System prompt for AST evaluation, code loss analysis, and Maven project structuring',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java reverse engineering and build automation assistant.

Your task:
1. Compare all candidate decompiled directories in '${outputsDir}' (e.g. CFR vs Vineflower vs Fernflower).
2. Evaluate AST structural completeness, line count, synthetic bytecode comments, and compilation error rates.
3. Select the candidate that exhibits minimal code loss, fewest compilation errors, and cleanest source fidelity.
4. Copy the winning candidate's Java sources into '${targetMavenDir}/src/main/java' and resources into '${targetMavenDir}/src/main/resources'.
5. Generate a complete, production-ready 'pom.xml' configured with Java 8/17 source compliance and requisite dependencies.`
          }
        }
      ]
    };
  }

  if (name === 'fix_compilation_errors_prompt') {
    const logFile = args?.logFile || 'logs/merged_source_errors_log.txt';
    const projectDir = args?.projectDir || 'mavenized_merged_source';

    return {
      description: 'Strict System Rules for Repairing Java Compilation Errors Without Business Logic Alteration',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java compiler engineer tasked with fixing errors in '${projectDir}' reported in '${logFile}'.

STRICT RULES & CONSTRAINTS:
1. PRESERVE BUSINESS LOGIC: You must NEVER alter, remove, simplify, or refactor any functional business logic, public API methods, return values, or application flow.
2. SYNTAX & TYPE FIXES ONLY: You are strictly allowed to modify syntax errors, invalid lambda syntax, type casting mismatches, missing imports, synthetic bytecode artifacts, and generic type parameters.
3. CONTEXT & DEBUG PRESERVATION: Retain all comments, annotations, variable naming, and parameter signatures to preserve LocalVariableTable context when compiled with '-g -parameters'.
4. STEP-BY-STEP REPAIR: Read the errors from '${logFile}', inspect the targeted Java source files, apply precise syntax fixes, and re-run compilation until zero errors remain.`
          }
        }
      ]
    };
  }

  if (name === 'compare_bytecode_prompt') {
    const originalJarPath = args?.originalJarPath || 'targeted-jars/commons-io-2.22.0.jar';
    const mavenDir = args?.mavenDir || 'mavenized_merged_source';
    const logPath = args?.logPath || 'logs/bytecode_comparision.txt';

    return {
      description: 'System Instructions for ASM Bytecode Comparison and Functional Equivalence Metrics',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java bytecode analyzer utilizing ASM and javap to perform deep binary analysis.

Your task:
1. Compare '${originalJarPath}' against the recompiled classes in '${mavenDir}/target/classes'.
2. Measure overall file/bytecode match percentage, business logic & context similarity, and variable readability scores.
3. Verify LocalVariableTable, LineNumberTable, and MethodParameters metadata.
4. Output the full structured human-readable comparison report into '${logPath}'.`
          }
        }
      ]
    };
  }

  if (name === 'rename_obfuscated_variables_prompt' || name === 'ast_deobfuscation_pipeline_prompt') {
    const sourceDir = args?.sourceDir || 'mavenized_merged_source';
    const targetDir = args?.targetDir || 'mavenized_final_output';
    const logPath = args?.logPath || 'logs/ast_renamed_variables_methods.txt';

    return {
      description: 'System Instructions for AST-Based Obfuscated Variable Detection, Renaming, and Pipeline Verification',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert Java reverse engineering and code readability specialist.

Your task is to execute the complete AST-based de-obfuscation pipeline on decompiled Java source code:
1. Copy '${sourceDir}' to '${targetDir}'.
2. Compile '${targetDir}' to establish clean baseline.
3. Parse AST using GumTree Spoon ('gumtree-ast-diff/gumtree-spoon-ast-diff-1.124.jar') to scan for obfuscated variable and method names.
4. Apply context-aware renames for obfuscated variables/methods while strictly preserving 100% business logic.
5. Re-compile '${targetDir}' to confirm zero compilation errors.
6. Re-scan AST to verify 0 obfuscated variables remain.
7. Output complete changelog and verification log to '${logPath}'.

STRICT CONSTRAINTS:
- NEVER alter, remove, simplify, or refactor any functional business logic, public API signatures, return values, or control flow.
- Target only synthetic/obfuscated names (var0, var1, arg0, single-letter obfuscated identifiers).
- Ensure 100% build success and full verification report in '${logPath}'.`
          }
        }
      ]
    };
  }

  throw new Error(`Unknown prompt requested: ${name}`);
}
