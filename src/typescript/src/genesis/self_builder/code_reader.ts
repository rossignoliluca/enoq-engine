/**
 * GENESIS SELF-BUILDER: CODE READER
 *
 * The system that can see itself.
 *
 * From the dialogue:
 * "ENOQ deve poter vedere il proprio codice"
 *
 * This module provides ENOQ with the ability to:
 * - Read its own source code
 * - Understand its structure
 * - Map its components
 * - Identify what it is
 *
 * The strange loop begins here:
 * The code that reads the code that reads the code...
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

export interface CodeFile {
  path: string;
  relativePath: string;
  content: string;
  lines: number;
  type: 'typescript' | 'json' | 'markdown' | 'other';
  module: string;
}

export interface CodebaseMap {
  root: string;
  files: CodeFile[];
  modules: ModuleInfo[];
  totalLines: number;
  structure: DirectoryNode;
}

export interface ModuleInfo {
  name: string;
  path: string;
  files: string[];
  exports: string[];
  description: string;
  lineCount: number;
}

export interface DirectoryNode {
  name: string;
  type: 'directory' | 'file';
  children?: DirectoryNode[];
  path: string;
}

// ============================================
// CODE READER
// ============================================

export class CodeReader {
  private rootPath: string;
  private cache: Map<string, CodeFile> = new Map();

  constructor(rootPath?: string) {
    // Default to ENOQ's own source directory
    this.rootPath = rootPath || path.resolve(__dirname, '../..');
  }

  /**
   * Read a single file
   */
  readFile(filePath: string): CodeFile | null {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.rootPath, filePath);

      if (this.cache.has(absolutePath)) {
        return this.cache.get(absolutePath)!;
      }

      const content = fs.readFileSync(absolutePath, 'utf-8');
      const relativePath = path.relative(this.rootPath, absolutePath);

      const file: CodeFile = {
        path: absolutePath,
        relativePath,
        content,
        lines: content.split('\n').length,
        type: this.getFileType(absolutePath),
        module: this.getModuleName(relativePath)
      };

      this.cache.set(absolutePath, file);
      return file;

    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Map the entire codebase
   */
  mapCodebase(): CodebaseMap {
    const files: CodeFile[] = [];
    const structure = this.buildDirectoryTree(this.rootPath);

    // Read all TypeScript files
    this.walkDirectory(this.rootPath, (filePath) => {
      if (filePath.endsWith('.ts') && !filePath.includes('node_modules')) {
        const file = this.readFile(filePath);
        if (file) files.push(file);
      }
    });

    // Group by module
    const modules = this.identifyModules(files);

    return {
      root: this.rootPath,
      files,
      modules,
      totalLines: files.reduce((sum, f) => sum + f.lines, 0),
      structure
    };
  }

  /**
   * Get GENESIS-specific components
   */
  getGenesisComponents(): {
    attractors: CodeFile | null;
    energy: CodeFile | null;
    field: CodeFile | null;
    seed: CodeFile | null;
    grow: CodeFile | null;
    spawn: CodeFile | null;
    creator: CodeFile | null;
  } {
    const genesisPath = path.join(this.rootPath, 'genesis');

    return {
      attractors: this.readFile(path.join(genesisPath, 'attractor.ts')),
      energy: this.readFile(path.join(genesisPath, 'energy.ts')),
      field: this.readFile(path.join(genesisPath, 'field.ts')),
      seed: this.readFile(path.join(genesisPath, 'seed.ts')),
      grow: this.readFile(path.join(genesisPath, 'grow.ts')),
      spawn: this.readFile(path.join(genesisPath, 'spawn.ts')),
      creator: this.readFile(path.join(genesisPath, 'creator.ts'))
    };
  }

  /**
   * Extract exports from a file
   */
  extractExports(file: CodeFile): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g;
    const defaultExportRegex = /export\s+default\s+(\w+)/g;
    const namedExportRegex = /export\s*\{\s*([^}]+)\s*\}/g;

    let match;
    while ((match = exportRegex.exec(file.content)) !== null) {
      exports.push(match[1]);
    }
    while ((match = defaultExportRegex.exec(file.content)) !== null) {
      exports.push(`default:${match[1]}`);
    }
    while ((match = namedExportRegex.exec(file.content)) !== null) {
      const names = match[1].split(',').map(n => n.trim().split(' ')[0]);
      exports.push(...names);
    }

    return exports;
  }

  /**
   * Find all references to a symbol
   */
  findReferences(symbol: string): Array<{ file: string; line: number; context: string }> {
    const references: Array<{ file: string; line: number; context: string }> = [];
    const map = this.mapCodebase();

    for (const file of map.files) {
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(symbol)) {
          references.push({
            file: file.relativePath,
            line: index + 1,
            context: line.trim()
          });
        }
      });
    }

    return references;
  }

  /**
   * Get a summary of what ENOQ is
   */
  getSelfSummary(): string {
    const map = this.mapCodebase();
    const genesis = this.getGenesisComponents();

    const lines: string[] = [];
    lines.push('# ENOQ Self-Summary');
    lines.push('');
    lines.push(`Total files: ${map.files.length}`);
    lines.push(`Total lines: ${map.totalLines}`);
    lines.push('');
    lines.push('## Modules');

    for (const mod of map.modules) {
      lines.push(`- **${mod.name}**: ${mod.description} (${mod.lineCount} lines)`);
    }

    lines.push('');
    lines.push('## GENESIS Components');

    if (genesis.attractors) {
      const exports = this.extractExports(genesis.attractors);
      lines.push(`- attractors: ${exports.join(', ')}`);
    }
    if (genesis.field) {
      const exports = this.extractExports(genesis.field);
      lines.push(`- field: ${exports.join(', ')}`);
    }
    if (genesis.seed) {
      const exports = this.extractExports(genesis.seed);
      lines.push(`- seed: ${exports.join(', ')}`);
    }

    return lines.join('\n');
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getFileType(filePath: string): CodeFile['type'] {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.md')) return 'markdown';
    return 'other';
  }

  private getModuleName(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    if (parts.length > 1) {
      return parts[0];
    }
    return 'root';
  }

  private walkDirectory(dir: string, callback: (filePath: string) => void): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
            this.walkDirectory(fullPath, callback);
          }
        } else {
          callback(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  private buildDirectoryTree(dir: string, depth: number = 0): DirectoryNode {
    const name = path.basename(dir);
    const node: DirectoryNode = {
      name,
      type: 'directory',
      path: dir,
      children: []
    };

    if (depth > 5) return node; // Limit depth

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          node.children!.push(this.buildDirectoryTree(fullPath, depth + 1));
        } else if (entry.name.endsWith('.ts')) {
          node.children!.push({
            name: entry.name,
            type: 'file',
            path: fullPath
          });
        }
      }
    } catch (error) {
      // Ignore
    }

    return node;
  }

  private identifyModules(files: CodeFile[]): ModuleInfo[] {
    const moduleMap = new Map<string, ModuleInfo>();

    for (const file of files) {
      const moduleName = file.module;

      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, {
          name: moduleName,
          path: path.dirname(file.path),
          files: [],
          exports: [],
          description: this.guessModuleDescription(moduleName),
          lineCount: 0
        });
      }

      const mod = moduleMap.get(moduleName)!;
      mod.files.push(file.relativePath);
      mod.exports.push(...this.extractExports(file));
      mod.lineCount += file.lines;
    }

    return Array.from(moduleMap.values());
  }

  private guessModuleDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'genesis': 'The meta-level that creates systems',
      'axis': 'Constitutional validation layer',
      'ethics': 'Ethical components (unpredictable)',
      'llm': 'LLM connectors',
      'self_builder': 'Self-modification capabilities',
      'root': 'Root level files'
    };

    return descriptions[name] || 'Module';
  }
}

// ============================================
// SINGLETON
// ============================================

export const codeReader = new CodeReader();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function readSelf(): CodebaseMap {
  return codeReader.mapCodebase();
}

export function getGenesisCode(): ReturnType<CodeReader['getGenesisComponents']> {
  return codeReader.getGenesisComponents();
}

export function getSelfSummary(): string {
  return codeReader.getSelfSummary();
}
