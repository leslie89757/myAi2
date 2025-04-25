import express from 'express';
import { 
  uploadDocument, 
  queryKnowledgeBase, 
  chatWithKnowledgeBase, 
  streamChatWithKnowledgeBase,
  deleteUserKnowledgeBase
} from '../../controllers/knowledgeBaseController';
import { upload, handleFileUploadErrors } from '../../middleware/fileUpload';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// 知识库相关路由
router.post('/upload', upload, handleFileUploadErrors, uploadDocument);
router.post('/query', queryKnowledgeBase);
router.post('/chat', chatWithKnowledgeBase);
router.post('/stream-chat', streamChatWithKnowledgeBase);
router.delete('/delete', authenticate, deleteUserKnowledgeBase);

export default router;
