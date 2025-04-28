/**
 * 知识库聊天页面的认证和会话管理增强脚本
 * 添加到知识库聊天页面以支持用户认证和正确的会话删除功能
 */

// 检查用户是否已登录，如果没有则重定向到登录页面
function checkAuthentication() {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    
    if (!accessToken || !userId) {
        console.log('用户未登录，重定向到登录页面');
        window.location.href = '/login';
        return false;
    }
    
    // 在页面顶部显示用户信息
    const username = localStorage.getItem('username') || '用户';
    if (document.getElementById('user-info')) {
        document.getElementById('user-info').textContent = `当前用户: ${username}`;
    } else {
        const userInfoDiv = document.createElement('div');
        userInfoDiv.id = 'user-info';
        userInfoDiv.className = 'user-info';
        userInfoDiv.textContent = `当前用户: ${username}`;
        
        // 添加登出按钮
        const logoutButton = document.createElement('button');
        logoutButton.textContent = '退出登录';
        logoutButton.className = 'logout-button';
        logoutButton.onclick = logout;
        userInfoDiv.appendChild(logoutButton);
        
        // 将用户信息添加到页面顶部
        const container = document.querySelector('.chat-container') || document.body;
        container.parentNode.insertBefore(userInfoDiv, container);
        
        // 添加CSS样式
        const style = document.createElement('style');
        style.textContent = `
            .user-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 20px;
                background-color: #f5f5f5;
                border-bottom: 1px solid #ddd;
                font-size: 14px;
                color: #666;
            }
            .logout-button {
                padding: 5px 10px;
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            .logout-button:hover {
                background-color: #e0e0e0;
            }
        `;
        document.head.appendChild(style);
    }
    
    return true;
}

// 登出函数
function logout() {
    const accessToken = localStorage.getItem('accessToken');
    
    if (accessToken) {
        // 调用登出API
        fetch(`${window.location.origin}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-API-Key': 'test_key'
            }
        })
        .then(response => response.json())
        .catch(error => console.error('登出失败:', error))
        .finally(() => {
            // 无论成功与否，清除本地存储并跳转到登录页面
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            window.location.href = '/login';
        });
    } else {
        // 如果没有访问令牌，直接跳转到登录页面
        window.location.href = '/login';
    }
}

// 获取带认证的请求头
function getAuthHeaders() {
    const accessToken = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': 'test_key'
    };
}

// 获取用户ID
function getUserId() {
    return localStorage.getItem('userId') || '';
}

// 修复会话删除功能
function enhanceSessionDeletion() {
    // 查找原始的删除会话函数
    if (typeof deleteCurrentSession === 'function') {
        console.log('增强会话删除功能');
        
        // 保存原始函数引用
        const originalDeleteSession = deleteCurrentSession;
        
        // 重写函数
        window.deleteCurrentSession = function() {
            if (!currentSessionId) {
                console.error('没有选中的会话');
                return;
            }
            
            const userId = getUserId();
            
            fetch(`${API_BASE_URL}/api/sessions/${currentSessionId}?userId=${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`删除会话失败: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // 刷新会话列表
                    loadSessions();
                    
                    // 清空聊天消息
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        chatMessages.innerHTML = '';
                    }
                    
                    // 重置当前会话ID
                    currentSessionId = null;
                    
                    // 更新会话标题
                    const currentSessionTitle = document.getElementById('currentSessionTitle');
                    if (currentSessionTitle) {
                        currentSessionTitle.textContent = '未选择会话';
                    }
                    
                    console.log('会话删除成功');
                } else {
                    console.error('会话删除失败:', data.error);
                }
            })
            .catch(error => {
                console.error('删除会话错误:', error);
            });
        };
    } else {
        console.warn('未找到原始的删除会话函数，无法增强');
    }
}

// 修复会话创建功能，添加用户ID
function enhanceSessionCreation() {
    if (typeof createNewSession === 'function') {
        console.log('增强会话创建功能');
        
        // 保存原始函数引用
        const originalCreateSession = createNewSession;
        
        // 重写函数
        window.createNewSession = function(sessionName) {
            const userId = getUserId();
            const title = sessionName || document.getElementById('sessionTitle')?.value || '新会话';
            const description = document.getElementById('sessionDesc')?.value || '';
            
            fetch(`${API_BASE_URL}/api/sessions`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    description,
                    userId
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`创建会话失败: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // 隐藏表单
                    const newSessionForm = document.getElementById('newSessionForm');
                    if (newSessionForm) {
                        newSessionForm.style.display = 'none';
                    }
                    
                    // 清空表单
                    if (document.getElementById('sessionTitle')) {
                        document.getElementById('sessionTitle').value = '';
                    }
                    if (document.getElementById('sessionDesc')) {
                        document.getElementById('sessionDesc').value = '';
                    }
                    
                    // 刷新会话列表
                    loadSessions();
                    
                    console.log('会话创建成功:', data.session);
                } else {
                    console.error('会话创建失败:', data.error);
                }
            })
            .catch(error => {
                console.error('创建会话错误:', error);
            });
        };
    } else {
        console.warn('未找到原始的创建会话函数，无法增强');
    }
}

// 修复会话加载功能，添加用户ID
function enhanceSessionsLoading() {
    if (typeof loadSessions === 'function') {
        console.log('增强会话加载功能');
        
        // 保存原始函数引用
        const originalLoadSessions = loadSessions;
        
        // 重写函数
        window.loadSessions = function() {
            const userId = getUserId();
            
            fetch(`${API_BASE_URL}/api/sessions?userId=${userId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`加载会话失败: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('获取到会话数据:', data);
                const sessionsList = document.getElementById('sessionsList');
                if (!sessionsList) {
                    console.error('未找到会话列表容器');
                    return;
                }
                
                sessionsList.innerHTML = '';
                
                // 检查是否有会话
                if (!data.sessions || data.sessions.length === 0) {
                    sessionsList.innerHTML = '<div class="no-sessions">暂无会话，请创建新会话</div>';
                    return;
                }
                
                // 加载存在的会话
                data.sessions.forEach(session => {
                    const sessionItem = document.createElement('div');
                    sessionItem.className = 'session-item';
                    if (session.id === currentSessionId) {
                        sessionItem.className += ' active';
                    }
                    
                    sessionItem.textContent = session.title;
                    
                    // 添加删除按钮
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-session';
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteButton.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除会话"${session.title}"吗？`)) {
                            currentSessionId = session.id;
                            deleteCurrentSession();
                        }
                    };
                    
                    sessionItem.appendChild(deleteButton);
                    
                    // 点击会话切换
                    sessionItem.onclick = () => {
                        if (currentSessionId !== session.id) {
                            currentSessionId = session.id;
                            loadMessages(session.id);
                            document.querySelectorAll('.session-item').forEach(item => {
                                item.classList.remove('active');
                            });
                            sessionItem.classList.add('active');
                        }
                    };
                    
                    sessionsList.appendChild(sessionItem);
                });
            })
            .catch(error => {
                console.error('加载会话列表错误:', error);
                const sessionsList = document.getElementById('sessionsList');
                if (sessionsList) {
                    sessionsList.innerHTML = '<div class="error-message">加载会话失败，请刷新页面重试</div>';
                }
            });
        };
    } else {
        console.warn('未找到原始的会话加载函数，无法增强');
    }
}

// 在页面完全加载后运行增强
document.addEventListener('DOMContentLoaded', function() {
    // 检查用户认证
    if (!checkAuthentication()) {
        return; // 未通过认证，不继续执行
    }
    
    // 监听DOM加载完成后的一小段时间，确保原始函数已定义
    setTimeout(() => {
        enhanceSessionDeletion();
        enhanceSessionCreation();
        enhanceSessionsLoading();
        
        console.log('认证和会话管理增强已应用');
    }, 500);
});

// 周期性检查认证状态
setInterval(checkAuthentication, 60000); // 每分钟检查一次
