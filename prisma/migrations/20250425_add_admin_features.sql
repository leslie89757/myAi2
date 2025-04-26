-- 添加用户状态字段
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

-- 创建系统配置表
CREATE TABLE "SystemConfig" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- 创建模板管理表
CREATE TABLE "SystemPrompt" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "SystemPrompt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SystemPrompt_name_type_key" ON "SystemPrompt"("name", "type");

-- 插入默认配置
INSERT INTO "SystemConfig" ("key", "value", "description", "updatedAt") 
VALUES 
('default_model', 'gpt-4o', '默认使用的AI模型', CURRENT_TIMESTAMP),
('knowledge_chat_temperature', '0.3', '知识库聊天的temperature参数', CURRENT_TIMESTAMP),
('max_token_limit', '4000', '单次请求的最大token数', CURRENT_TIMESTAMP);

-- 插入初始提示模板
INSERT INTO "SystemPrompt" ("name", "content", "type", "isDefault", "updatedAt")
VALUES
('默认知识库助手', '你是一个基于知识库的AI助手。请根据以下知识库内容回答用户的问题。\n如果知识库中的信息不足以回答问题，请明确告知用户你不知道答案，不要编造信息。\n回答时请引用知识库中的信息，并保持专业、简洁和有帮助。', 'knowledge_base', true, CURRENT_TIMESTAMP);
