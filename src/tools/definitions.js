/**
 * MCP Tool Declarations for JAR Decompiler MCP Server
 */

export const TOOLS = [
  {
    name: 'decompile_jar',
    description: 'Decompiles a Java .jar file into a target directory and returns comprehensive decompilation analytics, tree output, and logs.',
    inputSchema: {
      type: 'object',
      properties: {
        jarPath: {
          type: 'string',
          description: 'Absolute or relative path to the Java .jar file to decompile.'
        },
        outputDir: {
          type: 'string',
          description: 'Optional output directory path for decompiled source files. Defaults to decompiled-output/<jar_name>_<timestamp>.'
        },
        decompilerPath: {
          type: 'string',
          description: 'Optional explicit path to the decompiler binary or .jar (e.g., decompiler/cfr.jar). If omitted, automatically detects decompilers in decompiler/.'
        },
        decompilerType: {
          type: 'string',
          enum: ['auto', 'cfr', 'vineflower', 'fernflower', 'procyon', 'jadx', 'bytecode-viewer', 'generic'],
          description: 'Decompiler engine type. Defaults to "auto" which detects based on filename.'
        },
        extraArgs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional additional command-line arguments to pass directly to the decompiler engine.'
        }
      },
      required: ['jarPath']
    }
  },
  {
    name: 'list_decompilers',
    description: 'Lists all Java decompiler files (.jar or executables) currently found in the decompiler folder.',
    inputSchema: {
      type: 'object',
      properties: {
        decompilerDir: {
          type: 'string',
          description: 'Optional path to the decompiler folder. Defaults to the decompiler/ directory.'
        }
      }
    }
  },
  {
    name: 'analyze_decompilation_output',
    description: 'Analyzes an existing directory containing decompiled source code to count Java files, detect decompilation warnings/errors, and produce a directory tree.',
    inputSchema: {
      type: 'object',
      properties: {
        outputDir: {
          type: 'string',
          description: 'Path to the directory containing decompiled code.'
        }
      },
      required: ['outputDir']
    }
  },
  {
    name: 'evaluate_and_mavenize_sources',
    description: 'Evaluates decompiled outputs (comparing AST structure, line count, compiler warning count), chooses the best candidate with minimal code loss, and structures it into a clean Maven project with pom.xml.',
    inputSchema: {
      type: 'object',
      properties: {
        outputsDir: {
          type: 'string',
          description: 'Path to the directory containing candidate decompiled output folders (e.g. outputs/).'
        },
        targetMavenDir: {
          type: 'string',
          description: 'Path to target directory where the chosen source will be mavenized (e.g. mavenized_merged_source/).'
        },
        groupId: {
          type: 'string',
          description: 'Maven groupId. Defaults to org.apache.commons.'
        },
        artifactId: {
          type: 'string',
          description: 'Maven artifactId. Defaults to commons-io.'
        },
        version: {
          type: 'string',
          description: 'Maven artifact version. Defaults to 2.22.0.'
        }
      },
      required: ['outputsDir', 'targetMavenDir']
    }
  },
  {
    name: 'compile_maven_project',
    description: 'Compiles a Maven project using mvn clean compile, parses any compilation errors into a human-readable format, and writes the log file.',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: {
          type: 'string',
          description: 'Path to the mavenized project root directory.'
        },
        logPath: {
          type: 'string',
          description: 'Optional path to write the formatted compilation error log file. Defaults to logs/merged_source_errors_log.txt.'
        }
      },
      required: ['projectDir']
    }
  },
  {
    name: 'compare_bytecode_and_analyze',
    description: 'Performs ASM bytecode analysis comparing the original JAR against the recompiled mavenized source, outputting percentage match, business context similarity, and variable readability scores into a text log.',
    inputSchema: {
      type: 'object',
      properties: {
        originalJarPath: {
          type: 'string',
          description: 'Path to the original JAR file. Defaults to targeted-jars/commons-io-2.22.0.jar.'
        },
        mavenDir: {
          type: 'string',
          description: 'Path to the mavenized project directory. Defaults to mavenized_merged_source.'
        },
        logPath: {
          type: 'string',
          description: 'Path to output comparison report file. Defaults to logs/bytecode_comparision.txt.'
        },
        asmJarPath: {
          type: 'string',
          description: 'Path to ASM library JAR file. Defaults to asm-bytecode-analysis/asm-9.10.1.jar.'
        }
      }
    }
  },
  {
    name: 'generate_ast_and_detect_obfuscation',
    description: 'Uses GumTree Spoon AST Diff to parse Java source files, generate AST representations, and detect obfuscated or synthetic variable names (e.g., var0, arg1, single-letter, closure captures).',
    inputSchema: {
      type: 'object',
      properties: {
        sourceDir: {
          type: 'string',
          description: 'Path to the Java source directory to analyze. Defaults to mavenized_merged_source/src/main/java.'
        },
        gumtreeJarPath: {
          type: 'string',
          description: 'Path to the GumTree Spoon AST Diff JAR. Defaults to gumtree-ast-diff/gumtree-spoon-ast-diff-1.124.jar.'
        },
        logPath: {
          type: 'string',
          description: 'Path to output the obfuscation detection report. Defaults to logs/ast_obfuscation_detection.txt.'
        }
      }
    }
  },
  {
    name: 'rename_obfuscated_variables',
    description: 'Copies mavenized source to final output directory, applies obfuscated variable renames with meaningful names, adds changelog comments to modified files, and generates a comprehensive rename log. NEVER modifies business logic.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceDir: {
          type: 'string',
          description: 'Path to the source mavenized project to copy from. Defaults to mavenized_merged_source.'
        },
        targetDir: {
          type: 'string',
          description: 'Path to the target output directory. Defaults to mavenized_final_output.'
        },
        logPath: {
          type: 'string',
          description: 'Path to output the rename changelog. Defaults to logs/variable_rename_changelog.txt.'
        },
        renames: {
          type: 'array',
          description: 'Array of rename operations. Each entry: { file: "relative/path.java", oldName: "var1", newName: "testCount", line: 42 }.',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string', description: 'Relative path to the Java file from src/main/java' },
              oldName: { type: 'string', description: 'Current obfuscated variable name' },
              newName: { type: 'string', description: 'New meaningful variable name' },
              line: { type: 'integer', description: 'Optional line number where the variable is declared' }
            },
            required: ['file', 'oldName', 'newName']
          }
        }
      },
      required: ['renames']
    }
  },
  {
    name: 'run_ast_deobfuscation_pipeline',
    description: 'Runs the complete end-to-end AST de-obfuscation pipeline: copies mavenized_merged_source to mavenized_final_output, compiles, parses AST via GumTree Spoon to find obfuscated vars/methods, applies context-aware renames without changing business logic, verifies compilation, re-scans AST, and outputs logs to logs/ast_renamed_variables_methods.txt.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceDir: {
          type: 'string',
          description: 'Path to source mavenized project directory. Defaults to mavenized_merged_source.'
        },
        targetDir: {
          type: 'string',
          description: 'Path to target final output directory. Defaults to mavenized_final_output.'
        },
        gumtreeJarPath: {
          type: 'string',
          description: 'Path to GumTree Spoon AST Diff JAR. Defaults to gumtree-ast-diff/gumtree-spoon-ast-diff-1.124.jar.'
        },
        logPath: {
          type: 'string',
          description: 'Path to output the comprehensive AST rename report log. Defaults to logs/ast_renamed_variables_methods.txt.'
        },
        renames: {
          type: 'array',
          description: 'Optional custom rename entries array. If omitted, uses default AST-analyzed renames.',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string', description: 'Relative path to Java file from src/main/java' },
              oldName: { type: 'string', description: 'Obfuscated variable/method name' },
              newName: { type: 'string', description: 'Meaningful replacement name' },
              line: { type: 'integer', description: 'Optional line number' }
            },
            required: ['file', 'oldName', 'newName']
          }
        }
      }
    }
  }
];
