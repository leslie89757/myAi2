import express from 'express';
import { simpleChat } from '../controllers/simpleChatController';
import { streamChat } from '../controllers/streamChatController';

const router = express.Router();

// 聊天相关路由
router.post('/simple', simpleChat);
router.post('/stream', streamChat);

export default router;
