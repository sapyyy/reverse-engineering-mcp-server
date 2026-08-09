import fs from 'fs';
import path from 'path';
import { compileMavenizedProject } from './decompilerHandler.js';

const sourceDir = 'C:\\Users\\ghosh\\OneDrive\\Desktop\\Decompilation\\outputs\\guava-vineflower';
const targetDir = 'C:\\Users\\ghosh\\OneDrive\\Desktop\\Decompilation\\mavenized_merged_source';
const logPath = 'C:\\Users\\ghosh\\OneDrive\\Desktop\\Decompilation\\logs\\merged_source_errors_log.txt';

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

  const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.google.guava</groupId>
    <artifactId>guava</artifactId>
    <version>21.0</version>
    <name>guava</name>
    <description>Decompiled and Mavenized codebase for guava</description>

    <properties>
        <maven.compiler.source>1.8</maven.compiler.source>
        <maven.compiler.target>1.8</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter-api</artifactId>
            <version>5.10.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>1.8</source>
                    <target>1.8</target>
                    <compilerArgs>
                        <arg>-g</arg>
                        <arg>-parameters</arg>
                    </compilerArgs>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`;

  fs.writeFileSync(path.join(targetDir, 'pom.xml'), pomContent, 'utf8');

  console.log('3. Compiling Vineflower Guava with -g -parameters -proc:none...');
  const compileResult = await compileMavenizedProject({
    projectDir: targetDir,
    logPath
  });

  console.log('Compile Result:', JSON.stringify(compileResult, null, 2));
}

main().catch(console.error);
