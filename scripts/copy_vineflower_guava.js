import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { compileMavenizedProject } from '../src/decompilerHandler.js';
import { generatePomXml } from '../src/config.js';

// Parse command-line arguments with defaults
const args = process.argv.slice(2);
const sourceDir = args[0] || path.resolve(__dirname, '..', 'outputs', 'guava-vineflower');
const targetDir = args[1] || path.resolve(__dirname, '..', 'mavenized_merged_source');
const logPath = args[2] || path.resolve(__dirname, '..', 'logs', 'merged_source_errors_log.txt');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

async function main() {
  console.log('Source:', sourceDir);
  console.log('Target:', targetDir);
  console.log('Log:', logPath);

  console.log('1. Clearing target directory:', targetDir);
  if (fs.existsSync(targetDir)) {
    fs.readdirSync(targetDir).forEach((file) => {
      const curPath = path.join(targetDir, file);
      fs.rmSync(curPath, { recursive: true, force: true });
    });
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetJavaDir = path.join(targetDir, 'src', 'main', 'java');
  const targetResourcesDir = path.join(targetDir, 'src', 'main', 'resources');

  console.log('2. Copying Vineflower Guava Java sources to src/main/java...');
  copyRecursiveSync(path.join(sourceDir, 'com'), path.join(targetJavaDir, 'com'));

  if (fs.existsSync(path.join(sourceDir, 'META-INF'))) {
    copyRecursiveSync(path.join(sourceDir, 'META-INF'), path.join(targetResourcesDir, 'META-INF'));
  }

  const pomContent = generatePomXml({
    groupId: 'com.google.guava',
    artifactId: 'guava',
    version: '21.0',
    javaVersion: '1.8',
    compilerArgs: ['-g', '-parameters']
  });

  fs.writeFileSync(path.join(targetDir, 'pom.xml'), pomContent, 'utf8');

  console.log('3. Compiling Vineflower Guava with -g -parameters -proc:none...');
  const compileResult = await compileMavenizedProject({
    projectDir: targetDir,
    logPath
  });

  console.log('Compile Result:', JSON.stringify(compileResult, null, 2));
}

main().catch(console.error);
