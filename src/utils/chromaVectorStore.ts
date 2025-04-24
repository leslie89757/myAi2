import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import path from 'path';
import fs from 'fs';
import logger from './logger';
import { CustomOpenAIEmbeddings } from './customEmbeddings';

// 定义向量搜索结果类型
export interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  score: number;
}

/**
 * Chroma向量存储管理类
 * 使用Chroma DB存储文档嵌入向量
 */
export class ChromaVectorStore {
  private userId: string;
  private collectionName: string;
  private dbPath: string;
  private textSplitter: RecursiveCharacterTextSplitter;
  private embeddingModel: string = 'text-embedding-3-small';

  /**
   * 创建Chroma向量存储实例
   * @param userId 用户ID
   */
  /**
   * 验证 API 密钥是否存在且有效
   */
  private validateApiKey(): boolean {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim().length < 20 || apiKey === 'your_openai_api_key_here') {
      logger.error(`OPENAI_API_KEY 环境变量未设置或无效`);
      return false;
    }
    return true;
  }

  constructor(userId: string) {
    if (!this.validateApiKey()) {
      logger.error('OPENAI_API_KEY 环境变量未设置或无效，向量存储功能将不可用');
      throw new Error('OPENAI_API_KEY 环境变量未设置或无效，无法创建向量存储');
    }

    this.userId = userId;
    this.collectionName = `user-${userId}`;
    this.dbPath = path.join(process.cwd(), 'data', 'chroma');
    
    // 创建文本分割器
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // 确保存储目录存在
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  /**
   * 创建OpenAI嵌入模型
   * 如果API调用失败，使用伪嵌入作为备选方案
   */
  private async createEmbeddings(): Promise<CustomOpenAIEmbeddings> {
    return new CustomOpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: this.embeddingModel,
      // 添加备选嵌入函数，在API调用失败时使用
      fallbackToFakeEmbeddings: true,
    });
  }

  /**
   * 初始化向量存储
   */
  async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.dbPath)) {
        fs.mkdirSync(this.dbPath, { recursive: true });
        logger.info(`为用户 ${this.userId} 创建了新的向量存储目录: ${this.dbPath}`);
      }
      logger.info(`成功初始化Chroma向量存储，用户ID: ${this.userId}, 集合: ${this.collectionName}`);
    } catch (error: any) {
      logger.error(`初始化Chroma向量存储失败: ${error.message}`);
      throw new Error(`初始化向量存储失败: ${error.message}`);
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
      
      if (chunks.length === 0) {
        throw new Error('文档分割后没有有效内容');
      }
      
      // 创建文档对象
      const documents = chunks.map((chunk, i) => {
        return new Document({
          pageContent: chunk,
          metadata: {
            ...metadata,
            chunkIndex: i,
            totalChunks: chunks.length,
            userId: this.userId,
            timestamp: new Date().toISOString()
          }
        });
      });
      
      // 创建嵌入模型
      const embeddings = await this.createEmbeddings();
      
      try {
        // 尝试获取现有集合
        const existingStore = await Chroma.fromExistingCollection(embeddings, {
          collectionName: this.collectionName,
        });
        
        // 如果集合存在，添加文档
        await existingStore.addDocuments(documents);
        logger.info(`向现有集合添加了 ${documents.length} 个文档`);
      } catch (error) {
        // 如果集合不存在，创建新集合
        await Chroma.fromDocuments(documents, embeddings, {
          collectionName: this.collectionName,
        });
        logger.info(`创建了新集合并添加了 ${documents.length} 个文档`);
      }
      
      logger.info(`文档处理完成: 成功处理 ${documents.length} 个块，用户ID: ${this.userId}`);
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
      
      // 创建嵌入模型
      const embeddings = await this.createEmbeddings();
      
      try {
        // 获取Chroma集合
        const vectorStore = await Chroma.fromExistingCollection(embeddings, {
          collectionName: this.collectionName,
        });
        
        // 执行相似性搜索
        const results = await vectorStore.similaritySearchWithScore(query, topK);
        
        // 转换结果格式
        const searchResults: SearchResult[] = results.map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          score: score
        }));
        
        return searchResults;
      } catch (error: any) {
        // 如果集合不存在，返回空结果
        logger.warn(`用户 ${this.userId} 的知识库集合不存在，返回空结果`);
        return [];
      }
    } catch (error: any) {
      logger.error(`相似性搜索失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 删除用户的所有向量数据
   */
  async deleteUserData(): Promise<void> {
    try {
      await this.initialize();
      
      // 创建嵌入模型
      const embeddings = await this.createEmbeddings();
      
      try {
        // 尝试获取现有集合
        const vectorStore = await Chroma.fromExistingCollection(embeddings, {
          collectionName: this.collectionName,
        });
        
        // 删除所有文档
        // 使用空对象作为参数，表示删除所有文档
        await vectorStore.delete({});
        logger.info(`成功删除用户 ${this.userId} 的向量数据集合`);
      } catch (error: any) {
        // 如果集合不存在，忽略错误
        logger.info(`用户 ${this.userId} 的知识库集合不存在，无需删除`);
      }
    } catch (error: any) {
      logger.error(`删除向量数据错误: ${error.message}`);
      throw new Error(`删除向量数据失败: ${error.message}`);
    }
  }
}
