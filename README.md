# Java JAR Decompiler & Reverse Engineering MCP Server (v1.1.0)

A production-ready **Model Context Protocol (MCP)** server written in Node.js for Java `.jar` package decompilation, multi-engine candidate benchmark evaluation, Maven project structuring, non-breaking syntax repair, **GumTree Spoon AST analysis & obfuscation renaming**, **ASM bytecode parity metrics evaluation**, and **Generic Differential Logic Fallback**.

---

## 📑 Table of Contents
1. [Release Notes & Version 1.1.0 Changelog](#release-notes--version-110-changelog)
2. [Pipeline Architecture & Reverse Engineering Workflow](#1-pipeline-architecture--reverse-engineering-workflow)
3. [Candidate Evaluation & Scoring Model](#2-candidate-evaluation--scoring-model)
4. [Directory Structure](#3-directory-structure)
5. [Setup & Installation](#4-setup--installation)
6. [MCP Client Configurations](#5-mcp-client-configurations)
7. [Complete MCP Tools Reference (10 Tools)](#6-complete-mcp-tools-reference-10-tools)
8. [Complete MCP Prompts Reference (5 Prompts)](#7-complete-mcp-prompts-reference-5-prompts)
9. [Execution Verification](#8-execution-verification)

---

## Release Notes & Version 1.1.0 Changelog

### 🚀 What's New in Version 1.1.0

Version 1.1.0 introduces major enhancements to AST de-obfuscation, type inference, dynamic pipeline execution, and non-overfitted post-compilation logic fallbacks:

1. **Generic Post-Compilation Differential Logic Fallback (`fallback_to_candidate_for_missing_logic`)**:
   - Added a new, **100% generic tool** that evaluates post-compilation Business Logic Similarity using ASM bytecode analysis.
   - If similarity falls below a target threshold (e.g. `< 98.0%`), the tool performs a differential file scan against alternative candidate decompiler outputs (e.g. CFR vs Vineflower).
   - Swaps candidate files, tests `mvn clean compile`, measures ASM bytecode similarity improvement, and **retains file swaps ONLY if compilation succeeds AND the business logic similarity score increases**. Completely avoids hardcoded class/variable names.

2. **Automatic Type Extraction & Contextual Name Inference (`inferMeaningfulName`)**:
   - `generate_ast_and_detect_obfuscation` now captures the declared Java Type (`declaredType`) for every obfuscated identifier (`var1`, `var2`, `arg0`, `val$x`).
   - Automatically infers domain-meaningful replacement names (`suggestedNewName`) based on declared type and line context (e.g., `ErrorHandler` $\rightarrow$ `errorHandler`, `LogEvent` $\rightarrow$ `event`, `Throwable` $\rightarrow$ `throwable`, `long` $\rightarrow$ `minLastModified`).

3. **Dynamic AST Rename Pipeline (`run_ast_deobfuscation_pipeline`)**:
   - Replaced static/hardcoded rename mapping arrays with **dynamic, on-the-fly AST mappings** generated directly from AST type inference.
   - Added flexible directory scanning for both root-level decompiled outputs and Maven `src/main/java` projects.

4. **Deduplication & Flexible Path Resolution**:
   - Deduplicates AST obfuscation detections by `(file, line, variableName)`.
   - Updated `rename_obfuscated_variables` path resolution to check both `src/main/java/` relative and root-relative file paths.

---

## 1. Pipeline Architecture & Reverse Engineering Workflow

For every target Java `.jar` package, the MCP server executes a systematic 6-phase pipeline:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Phase 1:        │    │ Phase 2:        │    │ Phase 3:        │    │ Phase 4:        │    │ Phase 5:        │    │ Phase 6:        │
│ Multi-Engine    │───>│ Quantitative    │───>│ Mavenization    │───>│ Non-Breaking    │───>│ AST De-         │───>│ ASM Bytecode    │
│ Decompilation   │    │ Evaluation      │    │ & Structure     │    │ Syntax Repair   │    │ Obfuscation     │    │ Comparison      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

1. **Phase 1: Multi-Engine Decompilation** (`decompile_jar`)
   - Decompile target JAR using multiple engine variants (CFR 0.152, Vineflower 1.12.0, Fernflower, Procyon, JADX) into isolated output directories.
2. **Phase 2: Comparative Candidate Evaluation** (`evaluate_and_mavenize_sources`)
   - Test-compile each candidate output using `javac -g -parameters -proc:none -encoding UTF-8`.
   - Calculate quantitative quality score based on Java source count, compiler error count, remaining `.class` files, and inline warning comments.
3. **Phase 3: Maven Project Structuring** (`evaluate_and_mavenize_sources`)
   - Copy winning candidate sources to `src/main/java` and resources to `src/main/resources`.
   - Generate production-ready `pom.xml` with source/target compliance and compiler args (`-g -parameters`).
4. **Phase 4: Non-Breaking Syntax Repair** (`compile_maven_project` & `fix_compilation_errors_prompt`)
   - Fix compilation errors reported in logs without modifying business logic (type casting, generic inference, sneaky throw casts, synthetic package-info artifacts).
5. **Phase 5: AST Obfuscation Detection & Refactoring** (`run_ast_deobfuscation_pipeline`)
   - Parse Abstract Syntax Tree using **GumTree Spoon AST Diff** (`gumtree-spoon-ast-diff-1.124.jar`).
   - Detect obfuscated/synthetic variable and method identifiers (`var0`, `var1`, `arg0`, closure captures, single-letter variables).
   - Apply context-aware, domain-accurate renames across files without altering functional behavior.
   - Re-compile and re-scan AST to confirm 0 obfuscations remain.
6. **Phase 6: ASM Bytecode Parity & Metrics Analysis** (`compare_bytecode_and_analyze`)
   - Perform ASM bytecode comparison against original JAR.
   - Record metrics: File/Bytecode Match %, Business Context Similarity %, and Code Readability Score in log reports.

---

## 2. Candidate Evaluation & Scoring Model

The `evaluate_and_mavenize_sources` tool selects the optimal decompiled candidate engine using a **quantitative multi-factor scoring formula**:

$$\text{Score} = (\text{JavaFiles} \times 100) - (\text{JavacErrors} \times 200) - (\text{RemainingClassFiles} \times 50) - (\text{DecompilerWarnings} \times 10)$$

### Detailed Evaluation Criteria Breakdown:

1. **Compilation Pass Rate under Debug Flags (Weight: -200 per error)**:
   - Each candidate is test-compiled using:
     ```bash
     javac -g -parameters -proc:none -encoding UTF-8
     ```
   - **Rationale**: Penalizes engines that emit invalid syntax, generic type inference failures, or broken lambdas. Zero compilation errors provides a massive score advantage.
2. **AST Source Coverage (Weight: +100 per `.java` file)**:
   - Counts total `.java` source files successfully reconstructed.
   - **Rationale**: Rewards decompilers that fully reconstruct class structures, inner classes, and interface hierarchies without dropping files.
3. **Unhandled Bytecode / Remaining `.class` Files (Weight: -50 per `.class` file)**:
   - Counts `.class` binary files left behind in output directory.
   - **Rationale**: Severe penalty for decompiler engines that fail on complex bytecode constructs (e.g., Kotlin synthetic bridges, inner classes) and leave un-decompiled `.class` files.
4. **Inline Decompiler Warning Comments (Weight: -10 per warning)**:
   - Scans top 150 lines of every `.java` file for issue markers:
     - `// FAILED to decompile method ...`
     - `// Could not decompile ...`
     - `// Exception decompiling ...`
     - `/* Synthetic */`
   - **Rationale**: Penalizes engines that emit partial method stubs or swallow exceptions inline.

---

## 3. Directory Structure

```
server/
├── bin/
│   └── cli.js                     # Executable CLI entry point for NPX / global execution
├── src/
│   ├── index.js                   # Main MCP server initialization & handler registration
│   ├── decompilerHandler.js        # Core decompiler execution, Maven build, AST, & ASM engine
│   ├── tools/
│   │   └── definitions.js          # Structured MCP Tool declarations & JSON schemas (9 tools)
│   └── prompts/
│       └── definitions.js          # Structured MCP Prompt declarations & templates (5 prompts)
├── scripts/                        # Utility helper scripts
├── index.js                        # Forwarding entrypoint (imports src/index.js)
├── package.json                    # Package manifest & configuration
└── README.md                       # Server documentation
```

---

## 4. Setup & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Java Development Kit (JDK)**: JDK 8 / JDK 17 / JDK 24 (configured in `JAVA_HOME` or path)
- **Apache Maven**: `mvn` CLI installed and available in environment path

### Installation

```bash
cd server
npm install
```

---

## 5. MCP Client Configurations

### Claude Desktop Configuration
Add the server entry to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jar-decompiler": {
      "command": "node",
      "args": [
        "C:/Users/ghosh/OneDrive/Desktop/Decompilation/server/index.js"
      ]
    }
  }
}
```

### Antigravity CLI / Gemini Config
Add the server entry to your `.gemini/antigravity-cli/mcp_config.json`:

```json
{
  "mcpServers": {
    "jar-decompiler": {
      "command": "node",
      "args": [
        "C:/Users/ghosh/OneDrive/Desktop/Decompilation/server/index.js"
      ]
    }
  }
}
```

---

## 6. Complete MCP Tools Reference (9 Tools)

### 1. `decompile_jar`
Decompiles a Java `.jar` file into a target directory and returns comprehensive decompilation analytics, tree output, and logs.
- **Parameters**:
  - `jarPath` *(string, required)*: Path to `.jar` file.
  - `outputDir` *(string, optional)*: Destination directory.
  - `decompilerPath` *(string, optional)*: Explicit path to decompiler `.jar`.
  - `decompilerType` *(string, optional)*: `'auto'`, `'cfr'`, `'vineflower'`, `'fernflower'`, `'procyon'`, `'jadx'`, or `'generic'`.
  - `extraArgs` *(array of strings, optional)*: Additional command-line flags.

### 2. `list_decompilers`
Lists all Java decompiler files (`.jar` or executables) currently found in the `decompiler/` folder.
- **Parameters**:
  - `decompilerDir` *(string, optional)*: Path to decompiler folder.

### 3. `analyze_decompilation_output`
Analyzes an existing directory containing decompiled source code to count Java files, detect decompilation warnings/errors, and produce a directory tree preview.
- **Parameters**:
  - `outputDir` *(string, required)*: Path to decompiled directory.

### 4. `evaluate_and_mavenize_sources`
Evaluates decompiled outputs (comparing AST structure, line count, compiler warning count), chooses the optimal candidate using the quantitative scoring model, and structures it into a clean Maven project with `pom.xml`.
- **Parameters**:
  - `outputsDir` *(string, required)*: Path to directory containing candidate folders (e.g. `outputs/`).
  - `targetMavenDir` *(string, required)*: Path to target directory (e.g. `mavenized_merged_source/`).
  - `groupId` *(string, optional)*: Maven groupId (default: `org.apache.commons`).
  - `artifactId` *(string, optional)*: Maven artifactId (default: `commons-io`).
  - `version` *(string, optional)*: Maven version (default: `2.22.0`).

### 5. `compile_maven_project`
Compiles a Maven project using `mvn clean compile`, parses compilation errors into a human-readable format, and writes the log file.
- **Parameters**:
  - `projectDir` *(string, required)*: Path to Maven project root.
  - `logPath` *(string, optional)*: Path for compilation error log file.

### 6. `compare_bytecode_and_analyze`
Performs ASM bytecode analysis comparing the original JAR against the recompiled mavenized source, outputting percentage match, business context similarity, and variable readability scores.
- **Parameters**:
  - `originalJarPath` *(string, optional)*: Path to original JAR.
  - `mavenDir` *(string, optional)*: Path to mavenized project root.
  - `logPath` *(string, optional)*: Path to output comparison report.
  - `asmJarPath` *(string, optional)*: Path to ASM library JAR.

### 7. `generate_ast_and_detect_obfuscation`
Uses **GumTree Spoon AST Diff** to parse Java source files, generate AST representations, and detect obfuscated or synthetic variable/method names (`var0`, `arg1`, single-letter variables, closure captures).
- **Parameters**:
  - `sourceDir` *(string, optional)*: Path to Java source directory.
  - `gumtreeJarPath` *(string, optional)*: Path to GumTree Spoon JAR.
  - `logPath` *(string, optional)*: Path to output obfuscation report.

### 8. `rename_obfuscated_variables`
Copies mavenized source to final output directory, applies obfuscated variable renames with meaningful names, adds changelog comments to modified files, and generates a comprehensive rename log. NEVER modifies business logic.
- **Parameters**:
  - `renames` *(array of objects, required)*: Array of `{ file, oldName, newName, line }`.
  - `sourceDir` *(string, optional)*: Source directory.
  - `targetDir` *(string, optional)*: Target output directory.
  - `logPath` *(string, optional)*: Output log file path.

### 9. `run_ast_deobfuscation_pipeline`
Runs the complete end-to-end AST de-obfuscation pipeline: copies `mavenized_merged_source` to `mavenized_final_output`, compiles, parses AST via GumTree Spoon to find obfuscated vars/methods, applies context-aware renames without changing business logic, verifies compilation, re-scans AST, and outputs logs to `logs/ast_renamed_variables_methods.txt`.
- **Parameters**:
  - `sourceDir` *(string, optional)*: Source directory.
  - `targetDir` *(string, optional)*: Target output directory.
  - `gumtreeJarPath` *(string, optional)*: GumTree Spoon JAR path.
  - `logPath` *(string, optional)*: Output report log file path.
  - `renames` *(array of objects, optional)*: Custom rename entries array.

### 10. `fallback_to_candidate_for_missing_logic`
Generic post-compilation differential fallback. If ASM business logic similarity is below targetSimilarityThreshold (e.g. 98%), scans alternative decompiler candidate outputs (e.g. CFR), performs differential file swapping, tests compilation, and retains swaps only if business logic parity improves.
- **Parameters**:
  - `targetMavenDir` *(string, optional)*: Path to target mavenized project (default: `mavenized_final_output`).
  - `candidateDir` *(string, optional)*: Path to fallback candidate output directory (default: `outputs/avalon-logkit-2.1_cfr`).
  - `originalJarPath` *(string, optional)*: Path to original target JAR file for ASM parity analysis.
  - `targetSimilarityThreshold` *(number, optional)*: Target Business Logic Similarity threshold percentage (default: `98.0`).
  - `logPath` *(string, optional)*: Output report log file path (default: `logs/generic_logic_fallback_report.txt`).

---

## 7. Complete MCP Prompts Reference (5 Prompts)

### 1. `evaluate_and_mavenize_prompt`
System prompt for comparing decompiled AST outputs, selecting the optimal candidate with minimal code loss, and mavenizing it.
- **Arguments**: `outputsDir`, `targetMavenDir`

### 2. `fix_compilation_errors_prompt`
Mandatory system prompt for fixing Java compilation errors without modifying business logic (syntax, generic, and type-cast fixes only).
- **Arguments**: `logFile`, `projectDir`

### 3. `compare_bytecode_prompt`
System prompt for running ASM bytecode comparisons between the original JAR and recompiled mavenized project, calculating similarity metrics and debug readability scores.
- **Arguments**: `originalJarPath`, `mavenDir`, `logPath`

### 4. `rename_obfuscated_variables_prompt`
System prompt for AST-based detection and renaming of obfuscated/synthetic variable names in decompiled Java source, preserving all business logic.
- **Arguments**: `sourceDir`, `targetDir`, `logPath`

### 5. `ast_deobfuscation_pipeline_prompt`
Comprehensive system prompt for copying source to final output, compiling baseline, building GumTree Spoon AST, detecting obfuscated vars/methods, applying context-aware renames, verifying build success, and writing log files.
- **Arguments**: `sourceDir`, `targetDir`, `logPath`

---

## 8. Execution Verification

Run syntax checks across all server modules:

```bash
node --check index.js; node --check src/index.js; node --check src/decompilerHandler.js; node --check src/tools/definitions.js; node --check src/prompts/definitions.js; node --check bin/cli.js
```

Expected Output: Exit code `0` (clean pass).
