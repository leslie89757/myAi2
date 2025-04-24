import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import logger from './logger';

/**
 * 文档解析器 - 支持多种文件格式的文本提取
 */
export class DocumentParser {
  /**
   * 解析PDF文件
   * @param filePath PDF文件路径
   * @returns 提取的文本内容
   */
  static async parsePdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error: any) {
      logger.error(`PDF解析错误: ${error.message}`);
      throw new Error(`PDF解析失败: ${error.message}`);
    }
  }

  /**
   * 解析TXT文件
   * @param filePath TXT文件路径
   * @returns 提取的文本内容
   */
  static async parseTxt(filePath: string): Promise<string> {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      return text;
    } catch (error: any) {
      logger.error(`TXT解析错误: ${error.message}`);
      throw new Error(`TXT解析失败: ${error.message}`);
    }
  }

  /**
   * 解析DOCX文件
   * @param filePath DOCX文件路径
   * @returns 提取的文本内容
   */
  static async parseDocx(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error: any) {
      logger.error(`DOCX解析错误: ${error.message}`);
      throw new Error(`DOCX解析失败: ${error.message}`);
    }
  }

  /**
   * 解析DOC文件 (通过mammoth尝试解析)
   * @param filePath DOC文件路径
   * @returns 提取的文本内容
   */
  static async parseDoc(filePath: string): Promise<string> {
    try {
      // 尝试使用mammoth解析DOC文件
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error: any) {
      logger.error(`DOC解析错误: ${error.message}`);
      throw new Error(`DOC解析失败: ${error.message}`);
    }
  }

  /**
   * 根据文件扩展名解析文档
   * @param filePath 文件路径
   * @returns 提取的文本内容
   */
  static async parseDocument(filePath: string): Promise<string> {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.pdf':
        return this.parsePdf(filePath);
      case '.txt':
        return this.parseTxt(filePath);
      case '.docx':
        return this.parseDocx(filePath);
      case '.doc':
        return this.parseDoc(filePath);
      default:
        throw new Error(`不支持的文件格式: ${extension}`);
    }
  }
}
