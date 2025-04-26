import { fetchUtils } from 'react-admin';
import queryString from 'query-string';

// API基础URL
const apiUrl = 'http://localhost:3001/api/admin';

// 创建HTTP客户端，添加API密钥
const httpClient = (url, options = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    
    // 从localStorage获取管理员token
    const token = localStorage.getItem('admin_token');
    if (token) {
        options.headers.set('Authorization', `Bearer ${token}`);
    }
    
    // 添加API密钥到请求头 (根据项目配置)
    options.headers.set('X-API-Key', 'test_key');
    
    return fetchUtils.fetchJson(url, options);
};

export const dataProvider = {
    getList: (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        
        // 调整查询参数以匹配后端API期望的格式
        const query = {
            sortField: field || 'id',
            sortOrder: order || 'ASC',
            page: page || 1,
            limit: perPage || 10,
            ...params.filter
        };
        
        const url = `${apiUrl}/${resource}?${queryString.stringify(query)}`;
        
        return httpClient(url).then(({ headers, json }) => {
            // 从响应头获取总记录数 (使用content-range格式: 'items start-end/total')
            const contentRange = headers.get('content-range');
            let total = Array.isArray(json) ? json.length : 0;
            
            if (contentRange) {
                const match = contentRange.match(/\/(\d+)$/);
                if (match) total = parseInt(match[1], 10);
            }
            
            return {
                data: json,
                total: total || json.length
            };
        });
    },
    
    getOne: (resource, params) => {
        return httpClient(`${apiUrl}/${resource}/${params.id}`).then(({ json }) => ({
            data: json
        }));
    },
    
    getMany: (resource, params) => {
        const query = {
            ids: params.ids.join(',')
        };
        const url = `${apiUrl}/${resource}?${queryString.stringify(query)}`;
        
        return httpClient(url).then(({ json }) => ({
            data: json
        }));
    },
    
    getManyReference: (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        
        // 调整查询参数以匹配后端API期望的格式
        const query = {
            sortField: field || 'id',
            sortOrder: order || 'ASC',
            page: page || 1,
            limit: perPage || 10,
            ...params.filter,
            [params.target]: params.id
        };
        
        const url = `${apiUrl}/${resource}?${queryString.stringify(query)}`;
        
        return httpClient(url).then(({ headers, json }) => {
            const total = parseInt(
                headers.get('content-range')?.split('/').pop() || '0',
                10
            );
            
            return {
                data: json,
                total: total || json.length
            };
        });
    },
    
    create: (resource, params) => {
        return httpClient(`${apiUrl}/${resource}`, {
            method: 'POST',
            body: JSON.stringify(params.data)
        }).then(({ json }) => ({
            data: { ...params.data, id: json.id }
        }));
    },
    
    update: (resource, params) => {
        return httpClient(`${apiUrl}/${resource}/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(params.data)
        }).then(({ json }) => ({
            data: json
        }));
    },
    
    updateMany: (resource, params) => {
        const query = {
            ids: params.ids.join(',')
        };
        
        return httpClient(`${apiUrl}/${resource}?${queryString.stringify(query)}`, {
            method: 'PUT',
            body: JSON.stringify(params.data)
        }).then(({ json }) => ({
            data: json
        }));
    },
    
    delete: (resource, params) => {
        return httpClient(`${apiUrl}/${resource}/${params.id}`, {
            method: 'DELETE'
        }).then(({ json }) => ({
            data: json
        }));
    },
    
    deleteMany: (resource, params) => {
        const query = {
            ids: params.ids.join(',')
        };
        
        return httpClient(`${apiUrl}/${resource}?${queryString.stringify(query)}`, {
            method: 'DELETE'
        }).then(({ json }) => ({
            data: json
        }));
    }
};
