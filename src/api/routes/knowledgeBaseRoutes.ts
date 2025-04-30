import express from 'express';
import { 
  uploadDocument, 
  queryKnowledgeBase, 
  chatWithKnowledgeBase, 
  streamChatWithKnowledgeBase,
  deleteUserKnowledgeBase
} from '../controllers/knowledgeBaseController';
import { upload, handleFileUploadErrors } from '../../middleware/fileUpload';
import { authMiddleware } from '../middleware/jwtAuthMiddleware';

const router = express.Router();

// 知识库相关路由 - 所有知识库API都需要身份验证
// 上传文档API - 文件处理中间件必须先于认证中间件
router.post('/upload', upload, handleFileUploadErrors, authMiddleware, uploadDocument);

// 查询知识库API - 需要身份验证
router.post('/query', authMiddleware, queryKnowledgeBase);

// 与知识库对话API - 需要身份验证
router.post('/chat', authMiddleware, chatWithKnowledgeBase);

// 流式对话API - 需要身份验证
router.post('/stream-chat', authMiddleware, streamChatWithKnowledgeBase);

// 删除知识库API - 需要身份验证
router.delete('/delete', authMiddleware, deleteUserKnowledgeBase);

export default router;
