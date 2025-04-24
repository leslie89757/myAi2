import { OpenAIEmbeddings } from '@langchain/openai';
import logger from './logger';

// 自定义参数接口
interface CustomOpenAIEmbeddingsParams {
  openAIApiKey?: string;
  modelName?: string;
  fallbackToFakeEmbeddings?: boolean;
}

/**
 * 自定义OpenAI嵌入类，添加备选的伪嵌入功能
 */
export class CustomOpenAIEmbeddings extends OpenAIEmbeddings {
  fallbackToFakeEmbeddings: boolean;
  dimension: number = 1536; // OpenAI嵌入向量的维度
  
  constructor(params: CustomOpenAIEmbeddingsParams) {
    // 提取OpenAIEmbeddings需要的参数
    const openAIParams = {
      apiKey: params.openAIApiKey,
      modelName: params.modelName
    };
    
    super(openAIParams);
    this.fallbackToFakeEmbeddings = params.fallbackToFakeEmbeddings || false;
  }
  
  /**
   * 生成伪嵌入向量
   * @param text 文本内容
   * @returns 伪嵌入向量
   */
  private generateFakeEmbedding(text: string): number[] {
    logger.warn('使用伪随机向量作为备选方案');
    const vector: number[] = [];
    const seed = text.length;
    
    // 生成一个 1536 维的伪随机向量
    for (let i = 0; i < this.dimension; i++) {
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
  
  /**
   * 重写embedDocuments方法，添加备选的伪嵌入功能
   * @param texts 文本数组
   * @returns 嵌入向量数组
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      // 首先尝试使用OpenAI API
      return await super.embedDocuments(texts);
    } catch (error: any) {
      // 如果API调用失败且启用了备选方案，使用伪嵌入
      if (this.fallbackToFakeEmbeddings) {
        logger.error(`OpenAI嵌入API调用失败: ${error.message}，使用伪嵌入作为备选`);
        return texts.map(text => this.generateFakeEmbedding(text));
      }
      // 否则抛出错误
      throw error;
    }
  }
  
  /**
   * 重写embedQuery方法，添加备选的伪嵌入功能
   * @param text 查询文本
   * @returns 嵌入向量
   */
  async embedQuery(text: string): Promise<number[]> {
    try {
      // 首先尝试使用OpenAI API
      return await super.embedQuery(text);
    } catch (error: any) {
      // 如果API调用失败且启用了备选方案，使用伪嵌入
      if (this.fallbackToFakeEmbeddings) {
        logger.error(`OpenAI嵌入API调用失败: ${error.message}，使用伪嵌入作为备选`);
        return this.generateFakeEmbedding(text);
      }
      // 否则抛出错误
      throw error;
    }
  }
}
