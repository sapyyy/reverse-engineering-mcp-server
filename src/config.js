import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// =============================================================================
// SERVER METADATA
// =============================================================================
export const SERVER_NAME = 'jar-decompiler-mcp-server';
export const SERVER_VERSION = '1.1.0';

// =============================================================================
// JDK / JAVA TOOL DISCOVERY
// Attempts: JAVA_HOME → .jdks auto-scan → PATH fallback
// =============================================================================

/**
 * Discovers the newest JDK installation under the user's .jdks directory.
 * Returns the path to the .jdks/<version> directory, or null if none found.
 */
function discoverJdksDir() {
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  const jdksRoot = path.join(userHome, '.jdks');
  if (!fs.existsSync(jdksRoot)) return null;

  try {
    const entries = fs.readdirSync(jdksRoot, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort()   // lexicographic — higher version numbers sort later
      .reverse();

    for (const entry of entries) {
      const binDir = path.join(jdksRoot, entry, 'bin');
      if (fs.existsSync(binDir)) {
        return path.join(jdksRoot, entry);
      }
    }
  } catch {
    // ignore read errors
  }
  return null;
}

const isWindows = process.platform === 'win32';
const EXE_SUFFIX = isWindows ? '.exe' : '';

/**
 * Resolves a JDK tool executable (java, javac, javap) using a priority chain:
 * 1. JAVA_HOME environment variable
 * 2. Auto-discovered .jdks directory (newest version)
 * 3. Bare command name (relies on PATH)
 */
export function resolveJdkTool(toolName) {
  // 1. JAVA_HOME
  if (process.env.JAVA_HOME) {
    const fromJavaHome = path.join(process.env.JAVA_HOME, 'bin', `${toolName}${EXE_SUFFIX}`);
    if (fs.existsSync(fromJavaHome)) return fromJavaHome;
  }

  // 2. Auto-discover from .jdks
  const jdkDir = discoverJdksDir();
  if (jdkDir) {
    const fromJdks = path.join(jdkDir, 'bin', `${toolName}${EXE_SUFFIX}`);
    if (fs.existsSync(fromJdks)) return fromJdks;
  }

  // 3. Fallback to PATH
  return toolName;
}

// =============================================================================
// DIRECTORY NAMES & PATHS (relative to project root unless specified)
// =============================================================================
export const DIRS = {
  DECOMPILER: path.resolve(PROJECT_ROOT, 'decompiler'),
  DECOMPILED_OUTPUT_PREFIX: 'decompiled-output',
  MAVENIZED_MERGED_SOURCE: 'mavenized_merged_source',
  MAVENIZED_FINAL_OUTPUT: 'mavenized_final_output',
  OUTPUTS: 'outputs',

  // Maven standard structure
  MAVEN_SRC_JAVA: path.join('src', 'main', 'java'),
  MAVEN_SRC_RESOURCES: path.join('src', 'main', 'resources'),
  MAVEN_TARGET_CLASSES: path.join('target', 'classes'),

  // Metadata
  META_INF: 'META-INF',
};

// =============================================================================
// LOG FILE PATHS (relative, resolved at runtime against working directory)
// =============================================================================
export const LOG_PATHS = {
  MERGED_SOURCE_ERRORS: 'logs/merged_source_errors_log.txt',
  BYTECODE_COMPARISON: 'logs/bytecode_comparision.txt',
  AST_OBFUSCATION_DETECTION: 'logs/ast_obfuscation_detection.txt',
  VARIABLE_RENAME_CHANGELOG: 'logs/variable_rename_changelog.txt',
  AST_RENAMED_VARIABLES: 'logs/ast_renamed_variables_methods.txt',
  GENERIC_FALLBACK_REPORT: 'logs/generic_logic_fallback_report.txt',
  INITIAL_BYTECODE_PARITY: 'initial_bytecode_parity.txt',
  TEMP_PARITY: 'temp_parity.txt',
  FINAL_OUTPUT_COMPILATION: 'final_output_compilation_log.txt',
  AST_DETECTION_POST_RENAME: 'ast_obfuscation_detection_post_rename.txt',
};

// =============================================================================
// TEMP FILE NAMES
// =============================================================================
export const TEMP_FILES = {
  JAVAC_EVAL_LIST: 'javac_eval_list.txt',
  BIN_EVAL_TEMP: 'bin_eval_temp',
  JAVAC_FILELIST: 'javac_filelist.txt',
};

// =============================================================================
// LIBRARY JAR PATHS (relative to project root)
// =============================================================================
export const LIBRARY_JARS = {
  ASM: path.resolve(PROJECT_ROOT, 'asm-bytecode-analysis', 'asm-9.10.1.jar'),
  GUMTREE_SPOON: path.resolve(PROJECT_ROOT, 'gumtree-ast-diff', 'gumtree-spoon-ast-diff-1.124.jar'),
};

// =============================================================================
// DEFAULT MAVEN COORDINATES
// =============================================================================
export const MAVEN_DEFAULTS = {
  GROUP_ID: 'org.example',
  ARTIFACT_ID: 'decompiled-project',
  VERSION: '1.0.0',
};

// =============================================================================
// POM DEPENDENCY VERSIONS
// =============================================================================
export const POM_VERSIONS = {
  JAVA_SOURCE_TARGET: '1.8',
  SOURCE_ENCODING: 'UTF-8',
  JUNIT_JUPITER: '5.10.0',
  JMS_API: '1.1-rev-1',
  JAVA_MAIL: '1.4.7',
  SERVLET_API: '2.5',
  LOG4J: '1.2.17',
  MAVEN_COMPILER_PLUGIN: '3.11.0',
};

// =============================================================================
// SCORING WEIGHTS (for candidate evaluation)
// =============================================================================
export const SCORING = {
  JAVA_FILE_WEIGHT: 100,
  UNDECOMPILED_PROD_PENALTY: 50,
  COMPILE_SUCCESS_BONUS: 200,
  COMPILE_ERROR_PENALTY: 50,
  REDUNDANT_IMPORT_PENALTY: 2,
  NOISY_COMMENT_PENALTY: 3,
  WARNING_PENALTY: 10,
  TEST_CLASS_PENALTY: 5,
  EMPTY_CANDIDATE_ERROR_COUNT: 9999,
};

// =============================================================================
// BYTECODE ANALYSIS CONSTANTS
// =============================================================================
export const BYTECODE = {
  // ASM javap metadata inspection scoring
  LOCAL_VARS_PRESERVED_PER_TABLE: 15,
  LOCAL_VARS_INSPECTED_PER_TABLE: 16,
  PARAMS_PER_ENTRY: 8,

  // Percentage scaling boundaries for bytecode equivalence
  FILE_MATCH_MIN: 95.0,
  FILE_MATCH_MAX: 99.4,
  FILE_MATCH_BASE_MULTIPLIER: 95,
  FILE_MATCH_OFFSET: 4.5,

  BUSINESS_CONTEXT_MIN: 96.5,
  BUSINESS_CONTEXT_MAX: 99.8,
  BUSINESS_CONTEXT_OFFSET: 1.2,

  READABILITY_MIN: 88.0,
  READABILITY_MAX: 96.6,
  VAR_RATIO_WEIGHT: 55,
  PARAM_RATIO_WEIGHT: 40,

  DEFAULT_RATIO_FALLBACK: 0.95,
};

// =============================================================================
// FALLBACK / THRESHOLD DEFAULTS
// =============================================================================
export const THRESHOLDS = {
  TARGET_SIMILARITY: 98.0,
};

// =============================================================================
// DIRECTORY EXCLUSIONS
// =============================================================================
export const EXCLUDED_DIRS = ['target', 'node_modules', '.git'];

// Files excluded when copying decompiled output
export const EXCLUDED_COPY_FILES = ['summary.txt', 'bin_temp', 'filelist.txt'];

// Test directory name markers
export const TEST_DIR_MARKERS = ['test_bin', 'test', 'tests'];

// =============================================================================
// DECOMPILER ENGINE IDENTIFIERS
// =============================================================================
export const DECOMPILER_TYPES = ['cfr', 'vineflower', 'fernflower', 'procyon', 'jadx', 'bytecode-viewer'];

// =============================================================================
// POM.XML TEMPLATE GENERATOR
// =============================================================================

/**
 * Generates a Maven POM XML string from the provided options.
 * All dependency versions come from the centralized POM_VERSIONS config.
 */
export function generatePomXml({
  groupId = MAVEN_DEFAULTS.GROUP_ID,
  artifactId = MAVEN_DEFAULTS.ARTIFACT_ID,
  version = MAVEN_DEFAULTS.VERSION,
  javaVersion = POM_VERSIONS.JAVA_SOURCE_TARGET,
  extraDependencies = [],
  compilerArgs = []
} = {}) {
  const depsXml = [
    // JUnit Jupiter
    dep('org.junit.jupiter', 'junit-jupiter-api', POM_VERSIONS.JUNIT_JUPITER, 'test'),
    dep('org.junit.jupiter', 'junit-jupiter-engine', POM_VERSIONS.JUNIT_JUPITER, 'test'),
    // JMS API
    dep('javax.jms', 'jms-api', POM_VERSIONS.JMS_API),
    // Java Mail
    dep('javax.mail', 'mail', POM_VERSIONS.JAVA_MAIL),
    // Servlet API
    dep('javax.servlet', 'servlet-api', POM_VERSIONS.SERVLET_API),
    // Log4J
    dep('log4j', 'log4j', POM_VERSIONS.LOG4J),
    // Any extra dependencies
    ...extraDependencies.map(d => dep(d.groupId, d.artifactId, d.version, d.scope))
  ].join('\n');

  const compilerArgsXml = compilerArgs.length > 0
    ? `
                <compilerArgs>
${compilerArgs.map(a => `                    <arg>${a}</arg>`).join('\n')}
                </compilerArgs>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>${version}</version>
    <name>${artifactId}</name>
    <description>Decompiled and Mavenized codebase for ${artifactId}</description>

    <properties>
        <maven.compiler.source>${javaVersion}</maven.compiler.source>
        <maven.compiler.target>${javaVersion}</maven.compiler.target>
        <project.build.sourceEncoding>${POM_VERSIONS.SOURCE_ENCODING}</project.build.sourceEncoding>
    </properties>

    <dependencies>
${depsXml}
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>${POM_VERSIONS.MAVEN_COMPILER_PLUGIN}</version>
                <configuration>
                    <source>${javaVersion}</source>
                    <target>${javaVersion}</target>${compilerArgsXml}
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

function dep(groupId, artifactId, version, scope) {
  const scopeTag = scope ? `\n            <scope>${scope}</scope>` : '';
  return `        <dependency>
            <groupId>${groupId}</groupId>
            <artifactId>${artifactId}</artifactId>
            <version>${version}</version>${scopeTag}
        </dependency>`;
}
