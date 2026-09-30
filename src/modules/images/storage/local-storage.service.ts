import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageResult {
  path: string;
  filename: string;
  url: string;
  size: number;
}

export interface MultiVersionResult {
  original: StorageResult;
  thumbnail?: StorageResult;
  medium?: StorageResult;
  large?: StorageResult;
}

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'specimens');
    this.baseUrl =
      configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  /**
   * Save a single file to disk
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    subFolder?: string,
  ): Promise<StorageResult> {
    try {
      // Todas las versiones se generan en WebP (ImageProcessingService): la extensión lo refleja
      const ext = path.extname(originalName).toLowerCase();
      const filename = `${uuidv4()}${ext === '.webp' || buffer.subarray(8, 12).toString() === 'WEBP' ? '.webp' : ext}`;

      // Create directory structure: uploads/specimens/YYYY/MM/
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');

      const dirPath = subFolder
        ? path.join(this.uploadsDir, subFolder, year, month)
        : path.join(this.uploadsDir, year, month);

      await this.ensureDir(dirPath);

      // Full file path
      const filePath = path.join(dirPath, filename);
      const relativePath = path.relative(
        path.join(process.cwd(), 'uploads'),
        filePath,
      );

      // Write file
      await fs.writeFile(filePath, buffer);

      const stats = await fs.stat(filePath);

      this.logger.log(`File saved: ${relativePath} (${stats.size} bytes)`);

      return {
        path: relativePath.replace(/\\/g, '/'), // Normalize path separators
        filename: filename,
        url: `${this.baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`,
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save multiple versions of an image (original, thumbnail, medium, large)
   */
  async saveMultipleVersions(
    versions: Map<string, Buffer>,
    originalName: string,
  ): Promise<MultiVersionResult> {
    const result: MultiVersionResult = {} as MultiVersionResult;

    for (const [versionName, buffer] of versions.entries()) {
      const storageResult = await this.saveFile(
        buffer,
        originalName,
        versionName,
      );
      result[versionName as keyof MultiVersionResult] = storageResult;
    }

    return result;
  }

  /**
   * Delete a file from disk
   */
  async deleteFile(relativePath: string): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), 'uploads', relativePath);
      await fs.unlink(fullPath);
      this.logger.log(`File deleted: ${relativePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Failed to delete file: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Delete all versions of an image
   */
  async deleteAllVersions(versions: MultiVersionResult): Promise<void> {
    const paths = Object.values(versions).map((v) => v.path);
    await Promise.all(paths.map((p) => this.deleteFile(p)));
  }

  /**
   * Get file as buffer
   */
  async getFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(process.cwd(), 'uploads', relativePath);
    return fs.readFile(fullPath);
  }

  /**
   * Check if file exists
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), 'uploads', relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
  }> {
    let totalFiles = 0;
    let totalSize = 0;

    const scanDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else {
          totalFiles++;
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    };

    try {
      await scanDir(this.uploadsDir);
    } catch (error) {
      this.logger.error(`Failed to get storage stats: ${error.message}`);
    }

    return { totalFiles, totalSize };
  }
}
