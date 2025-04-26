import { PrismaClient } from '../src/generated/prisma';
import logger from '../src/utils/logger';

const prisma = new PrismaClient();

/**
 * 添加测试会话数据
 */
async function seedSessionData() {
  try {
    // 获取第一个用户（确保数据库中至少有一个用户）
    const user = await prisma.user.findFirst();
    
    if (!user) {
      logger.error('未找到用户，请先创建至少一个用户');
      return;
    }
    
    logger.info(`为用户 ${user.username} (ID: ${user.id}) 创建测试会话数据`);

    // 创建测试会话1
    const session1 = await prisma.session.create({
      data: {
        title: '关于人工智能的讨论',
        description: '探讨AI的发展趋势和应用场景',
        userId: user.id,
        messages: {
          create: [
            {
              role: 'user',
              content: '人工智能未来会如何发展？',
              tokens: 15
            },
            {
              role: 'assistant',
              content: '人工智能未来的发展可能会朝着几个方向：\n\n1. 更强的通用人工智能(AGI)，能够处理多种不同类型的任务\n2. 更好的多模态能力，能够同时理解文本、图像、声音等多种输入\n3. 更强的推理能力和因果理解\n4. 更好的与人类价值观对齐\n5. 更高效的训练方法和更低的能耗\n\n这些发展将使AI在医疗、教育、科研等领域产生更大的影响。',
              tokens: 180
            },
            {
              role: 'user',
              content: '你认为AI会取代人类工作吗？',
              tokens: 12
            },
            {
              role: 'assistant',
              content: 'AI确实会改变就业市场，但"取代"可能不是最准确的描述。更可能的情况是：\n\n1. 自动化：重复性、可预测的工作可能会被AI自动化\n2. 增强：许多职业会被AI增强而非取代，人类与AI协作\n3. 转变：新的工作类型会出现，需要新的技能组合\n4. 创造：AI将创造新的就业机会和行业\n\n关键是人类需要适应这种变化，培养创造力、批判性思维、情感智能等AI难以复制的能力，并学习如何有效地与AI协作。',
              tokens: 220
            }
          ]
        }
      },
      include: {
        messages: true
      }
    });

    // 创建测试会话2
    const session2 = await prisma.session.create({
      data: {
        title: '编程问题解答',
        description: '讨论JavaScript和React相关问题',
        userId: user.id,
        messages: {
          create: [
            {
              role: 'user',
              content: '如何在React中实现状态管理？',
              tokens: 14
            },
            {
              role: 'assistant',
              content: 'React中有多种状态管理方式：\n\n1. **useState Hook**：适用于简单组件状态\n```jsx\nconst [count, setCount] = useState(0);\n```\n\n2. **useReducer Hook**：适用于复杂状态逻辑\n```jsx\nconst [state, dispatch] = useReducer(reducer, initialState);\n```\n\n3. **Context API**：适用于跨组件共享状态\n```jsx\nconst ThemeContext = createContext();\n```\n\n4. **Redux**：适用于大型应用的全局状态管理\n\n5. **Zustand/Jotai/Recoil**：现代轻量级状态管理库\n\n选择哪种方式取决于你的应用复杂度和需求。',
              tokens: 250
            },
            {
              role: 'user',
              content: 'Promise和async/await有什么区别？',
              tokens: 16
            },
            {
              role: 'assistant',
              content: 'Promise和async/await本质上是处理JavaScript异步操作的两种不同语法：\n\n**Promise**：\n- 引入于ES6\n- 使用.then()和.catch()链式调用处理结果和错误\n- 可以使用Promise.all()等方法组合多个Promise\n\n```javascript\nfetch("https://api.example.com/data")\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error(error));\n```\n\n**Async/Await**：\n- 引入于ES8(ES2017)\n- 是Promise的语法糖，让异步代码看起来像同步代码\n- 使用try/catch处理错误\n\n```javascript\nasync function fetchData() {\n  try {\n    const response = await fetch("https://api.example.com/data");\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error(error);\n  }\n}\n```\n\n**主要区别**：\n- Async/await使代码更易读和维护\n- Async/await使调试更容易\n- Promise更适合处理并行操作\n- 所有async函数都返回Promise\n\n两者可以混合使用，根据具体场景选择最合适的语法。',
              tokens: 350
            }
          ]
        }
      },
      include: {
        messages: true
      }
    });

    // 创建测试会话3（空会话，没有消息）
    const session3 = await prisma.session.create({
      data: {
        title: '新项目规划',
        description: '讨论新Web应用的架构和技术选型',
        userId: user.id
      }
    });

    logger.info(`成功创建了3个测试会话：
    1. ${session1.title} (ID: ${session1.id}) - ${session1.messages.length}条消息
    2. ${session2.title} (ID: ${session2.id}) - ${session2.messages.length}条消息
    3. ${session3.title} (ID: ${session3.id}) - 0条消息`);

    return { session1, session2, session3 };
  } catch (error: any) {
    logger.error(`添加测试数据失败: ${error.message}`);
    throw error;
  }
}

// 执行种子脚本
async function main() {
  try {
    logger.info('开始添加测试会话数据...');
    await seedSessionData();
    logger.info('测试数据添加完成！');
  } catch (error: any) {
    logger.error(`测试数据添加失败: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
