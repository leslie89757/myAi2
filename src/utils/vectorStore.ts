import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import logger from './logger';
import { openai } from './openai';

// 验证 API 密钥是否存在且有效
function validateApiKey(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length < 20 || apiKey === 'your_openai_api_key_here') {
    logger.error(`OPENAI_API_KEY 环境变量未设置或无效`);
    return false;
  }
  return true;
}

// 定义文档片段类型
interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
}

// 定义向量搜索结果类型
interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  score: number;
}

/**
 * 简单的向量存储管理类
 * 使用文件系统存储文档和嵌入向量
 */
export class VectorStore {
  private openai: OpenAI;
  private userId: string;
  private storageDir: string;
  private embeddingModel: string = 'text-embedding-3-small';
  private textSplitter: RecursiveCharacterTextSplitter;

  /**
   * 创建向量存储实例
   * @param userId 用户ID
   * @param apiKey OpenAI API密钥（可选）
   */
  constructor(userId: string, apiKey?: string) {
    if (!validateApiKey()) {
      logger.error('OPENAI_API_KEY 环境变量未设置或无效，向量存储功能将不可用');
      throw new Error('OPENAI_API_KEY 环境变量未设置或无效，无法创建向量存储');
    }

    this.userId = userId;
    this.storageDir = path.join(process.cwd(), 'data', 'embeddings', userId);
    
    // 创建OpenAI客户端
    this.openai = openai;
    this.embeddingModel = 'text-embedding-3-small';
    
    // 创建文本分割器
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // 确保存储目录存在
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * 初始化向量存储
   */
  async initialize(): Promise<void> {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      logger.info(`为用户 ${this.userId} 创建了新的向量存储目录`);
    } else {
      logger.info(`成功加载用户 ${this.userId} 的向量存储`);
    }
  }

  /**
   * 将文本分割成块
   * @param text 要分割的文本
   * @returns 文本块数组
   */
  private async splitText(text: string): Promise<string[]> {
    try {
      // 使用 RecursiveCharacterTextSplitter 分割文本
      return await this.textSplitter.splitText(text);
    } catch (error: any) {
      logger.error(`文本分割失败: ${error.message}`);
      // 如果分割失败，使用简单的分割方法作为后备
      const chunks: string[] = [];
      const paragraphs = text.split(/\n\s*\n/);
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim().length > 0) {
          chunks.push(paragraph.trim());
        }
      }
      
      return chunks;
    }
  }

  /**
   * 获取文本的嵌入向量
   * @param text 文本内容
   * @returns 嵌入向量
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      logger.info(`生成嵌入向量，文本长度: ${text.length}`);
      
      try {
        // 使用 OpenAI API 生成真正的嵌入向量
        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: text
        });
        
        // 根据 OpenAI API 的最新响应结构获取嵌入向量
        if (response && response.data && response.data.length > 0) {
          const embedding = response.data[0].embedding;
          if (embedding && Array.isArray(embedding)) {
            logger.info(`成功生成 OpenAI 嵌入向量，维度: ${embedding.length}`);
            return embedding;
          }
        }
        
        // 如果响应结构不符合预期，抛出错误
        throw new Error('无法从 OpenAI API 响应中提取嵌入向量');
      } catch (apiError: any) {
        // 如果 OpenAI API 调用失败，使用伪随机向量作为后备
        logger.warn(`OpenAI 嵌入 API 调用失败: ${apiError.message}，切换到伪向量模式`);
        
        // 生成伪随机向量
        const vector: number[] = [];
        const seed = text.length;
        
        // 生成一个 1536 维的伪随机向量
        for (let i = 0; i < 1536; i++) {
          // 使用简单的伪随机数生成算法
          const hash = Math.sin(seed * i) * 10000;
          vector.push(hash - Math.floor(hash));
        }
        
        // 归一化向量
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        const normalizedVector = vector.map(val => val / magnitude);
        
        logger.info(`成功生成伪嵌入向量，维度: ${normalizedVector.length}`);
        return normalizedVector;
      }
    } catch (error: any) {
      logger.error(`生成嵌入向量失败: ${error.message}`);
      throw new Error(`生成嵌入向量失败: ${error.message}`);
    }
  }

  /**
   * 计算两个向量之间的余弦相似度
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 将文本分块并添加到向量存储
   * @param text 要处理的文本
   * @param metadata 文档元数据
   */
  async addDocument(text: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      await this.initialize();
      
      // 文本分块
      const chunks = await this.splitText(text);
      logger.info(`文档已分割为 ${chunks.length} 个块，用户ID: ${this.userId}`);
      
      // 为每个块创建嵌入向量并存储
      const totalChunks = chunks.length;
      let successfulChunks = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunk = chunks[i];
          if (chunk.trim().length < 10) {
            logger.info(`跳过太短的块 #${i}/${totalChunks} (长度: ${chunk.trim().length})`);
            continue; // 跳过太短的块
          }
          
          logger.info(`处理块 #${i + 1}/${totalChunks} (长度: ${chunk.length})`);
          
          const chunkId = `${Date.now()}-${i}`;
          
          // 获取嵌入向量
          let embedding;
          try {
            embedding = await this.getEmbedding(chunk);
          } catch (embeddingError: any) {
            logger.error(`块 #${i + 1}/${totalChunks} 获取嵌入向量失败: ${embeddingError.message}`);
            continue; // 跳过此块，继续处理其他块
          }
          
          const documentChunk: DocumentChunk = {
            id: chunkId,
            content: chunk,
            embedding: embedding,
            metadata: {
              ...metadata,
              chunkIndex: i,
              totalChunks: chunks.length,
              userId: this.userId,
              timestamp: new Date().toISOString()
            }
          };
          
          // 保存到文件系统
          const filePath = path.join(this.storageDir, `${chunkId}.json`);
          fs.writeFileSync(filePath, JSON.stringify(documentChunk, null, 2), 'utf8');
          
          successfulChunks++;
          logger.info(`成功保存块 #${i + 1}/${totalChunks} 到文件: ${filePath}`);
        } catch (chunkError: any) {
          logger.error(`处理块 #${i + 1}/${totalChunks} 失败: ${chunkError.message}`);
          // 继续处理其他块
        }
      }
      
      logger.info(`文档处理完成: 成功处理 ${successfulChunks}/${totalChunks} 个块，用户ID: ${this.userId}`);
      
      if (successfulChunks === 0 && totalChunks > 0) {
        throw new Error(`所有块处理失败，无法添加文档`);
      }
    } catch (error: any) {
      logger.error(`添加文档失败: ${error.message}, 用户ID: ${this.userId}`);
      throw new Error(`添加文档失败: ${error.message}`);
    }
  }

  /**
   * 相似性搜索
   * @param query 查询文本
   * @param topK 返回的最相关结果数量
   * @returns 相关文档及其相似度分数
   */
  async similaritySearch(query: string, topK: number = 5): Promise<Array<SearchResult>> {
    try {
      await this.initialize();
      
      // 获取查询的嵌入向量
      const queryEmbedding = await this.getEmbedding(query);
      
      // 读取所有存储的文档块
      const files = fs.readdirSync(this.storageDir).filter(file => file.endsWith('.json'));
      
      if (files.length === 0) {
        logger.info(`用户 ${this.userId} 的知识库为空`);
        return [];
      }
      
      // 计算相似度并排序
      const results: Array<{chunk: DocumentChunk, score: number}> = [];
      
      for (const file of files) {
        const filePath = path.join(this.storageDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const chunk = JSON.parse(content) as DocumentChunk;
        
        if (!chunk.embedding) continue;
        
        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        results.push({
          chunk,
          score: similarity
        });
      }
      
      // 按相似度排序并返回前K个结果
      const topResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(result => ({
          content: result.chunk.content,
          metadata: result.chunk.metadata,
          score: result.score
        }));
      
      return topResults;
    } catch (error: any) {
      logger.error(`相似性搜索失败: ${error.message}`);
      throw new Error(`相似性搜索失败: ${error.message}`);
    }
  }

  /**
   * 删除用户的所有向量数据
   */
  async deleteUserData(): Promise<void> {
    try {
      if (fs.existsSync(this.storageDir)) {
        const files = fs.readdirSync(this.storageDir);
        
        for (const file of files) {
          fs.unlinkSync(path.join(this.storageDir, file));
        }
        
        fs.rmdirSync(this.storageDir);
        logger.info(`成功删除用户 ${this.userId} 的所有向量数据`);
      }
    } catch (error: any) {
      logger.error(`删除向量数据错误: ${error.message}`);
      throw new Error(`删除向量数据失败: ${error.message}`);
    }
  }
}
