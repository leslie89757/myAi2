// 认证提供者
const apiUrl = 'http://localhost:3001/api/admin';

export const authProvider = {
    // 处理登录
    login: ({ username, password }) => {
        // 将输入的用户名作为邮箱发送给后端
        console.log('Login attempt with:', { email: username, password: password ? '****' : undefined });
        
        const request = new Request(`${apiUrl}/login`, {
            method: 'POST',
            body: JSON.stringify({ email: username, password }),
            headers: new Headers({ 
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key' // 添加API密钥
            }),
        });
        
        return fetch(request)
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    // 获取更详细的错误信息
                    return response.json().then(error => {
                        throw new Error(error.error || response.statusText);
                    }).catch(() => {
                        throw new Error(response.statusText || '登录失败');
                    });
                }
                return response.json();
            })
            .then(auth => {
                // 存储认证信息
                localStorage.setItem('admin_token', auth.token);
                localStorage.setItem('admin_user', JSON.stringify(auth.user));
                
                return auth;
            })
            .catch((error) => {
                console.error('Login error:', error);
                throw new Error(error.message || '用户名或密码错误');
            });
    },
    
    // 处理登出
    logout: () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        return Promise.resolve();
    },
    
    // 检查错误，如果是认证错误则重定向到登录页
    checkError: (error) => {
        const status = error.status;
        if (status === 401 || status === 403) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            return Promise.reject({ redirectTo: '/login', message: '未授权或会话已过期' });
        }
        return Promise.resolve();
    },
    
    // 检查认证状态
    checkAuth: () => {
        return localStorage.getItem('admin_token')
            ? Promise.resolve()
            : Promise.reject({ message: '请先登录' });
    },
    
    // 获取权限
    getPermissions: () => {
        const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
        return Promise.resolve(user.role || 'guest');
    },
    
    // 获取身份
    getIdentity: () => {
        const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
        if (!user.id) {
            return Promise.reject('未登录');
        }
        
        return Promise.resolve({
            id: user.id,
            fullName: user.username,
            avatar: null,
        });
    }
};
