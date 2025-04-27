#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试脚本: 验证 myai-backend API 的认证流程
包括: 登录/注册、令牌验证、API访问、令牌刷新和登出
"""

import requests
import json
import random
import time
import os
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

# 配置 - 优先使用环境变量中的API_BASE_URL
API_BASE_URL = os.environ.get("API_BASE_URL", "https://myai-backend.vercel.app")
API_KEY = "test_key"  # 全局API密钥
TEST_USER = {
    "login": f"test{random.randint(1000, 9999)}@example.com",  # 随机邮箱确保每次测试都创建新用户
    "password": "Test@123456"
}

# 存储会话状态
class SessionState:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.is_new_user = False
        
session = SessionState()

# 彩色日志函数
class Logger:
    @staticmethod
    def info(msg: str) -> None:
        print(f"\033[36m[INFO] {msg}\033[0m")
    
    @staticmethod
    def success(msg: str) -> None:
        print(f"\033[32m[SUCCESS] {msg}\033[0m")
    
    @staticmethod
    def error(msg: str) -> None:
        print(f"\033[31m[ERROR] {msg}\033[0m")
    
    @staticmethod
    def warn(msg: str) -> None:
        print(f"\033[33m[WARNING] {msg}\033[0m")
    
    @staticmethod
    def debug(obj: Any) -> None:
        print(f"\033[35m[DEBUG] {json.dumps(obj, ensure_ascii=False, indent=2)}\033[0m")

# 初始化HTTP客户端
def get_headers(with_token: bool = False) -> Dict[str, str]:
    """获取HTTP请求头"""
    headers = {
        "Content-Type": "application/json", 
        "X-API-Key": API_KEY
    }
    
    if with_token and session.access_token:
        headers["Authorization"] = f"Bearer {session.access_token}"
    
    return headers

# 测试函数
def check_server_running() -> bool:
    """检查服务器是否在运行"""
    Logger.info("检查服务器是否在运行...")
    try:
        # 尝试正确的健康检查端点 /health 而不是 /api/health
        response = requests.get(f"{API_BASE_URL}/health", headers=get_headers())
        if response.status_code == 200:
            Logger.success("服务器已启动")
            return True
        else:
            Logger.warn(f"服务器返回非200状态码: {response.status_code}")
            try:
                Logger.debug(response.json())
            except Exception:
                Logger.warn(f"无法解析响应为JSON: {response.text}")
            return True  # 仍然继续测试，因为API可能仍然工作
    except requests.exceptions.ConnectionError as e:
        Logger.error(f"无法连接到服务器: {str(e)}")
        # 尝试备用健康检查端点
        try:
            Logger.info("尝试备用健康检查端点(/api/health)...")
            response = requests.get(f"{API_BASE_URL}/api/health", headers=get_headers())
            if response.status_code == 200:
                Logger.success("服务器已启动(备用端点)")
                return True
            else:
                Logger.error(f"备用健康检查失败，状态码: {response.status_code}")
        except Exception:
            pass
        return False
    except json.JSONDecodeError as e:
        Logger.warn(f"JSON解析错误: {str(e)}，但服务器可能仍在运行")
        return True  # 继续测试
    except Exception as e:
        Logger.error(f"检查服务器状态时发生错误: {str(e)}")
        # 尝试最后一个备用方法 - 直接访问API登录端点
        try:
            Logger.info("尝试直接检查登录API端点...")
            test_response = requests.get(f"{API_BASE_URL}/api/auth/login", headers=get_headers())
            if test_response.status_code in [200, 401, 405]:  # 任何有效响应
                Logger.success("API端点可访问，继续测试")
                return True
        except Exception:
            pass
        return False

def test_login_or_register() -> bool:
    """测试登录/注册API"""
    Logger.info(f"测试登录/注册 API，使用账号: {TEST_USER['login']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/login",
            headers=get_headers(),
            json=TEST_USER
        )
        
        if response.status_code != 200:
            Logger.error(f"登录/注册失败，状态码: {response.status_code}")
            Logger.debug(response.json())
            return False
        
        data = response.json()
        
        # 保存会话信息
        session.access_token = data.get("accessToken")
        session.refresh_token = data.get("refreshToken")
        session.user_id = data.get("user", {}).get("id")
        session.is_new_user = data.get("isNewUser", False)
        
        if not session.access_token or not session.refresh_token:
            Logger.error("响应中缺少令牌信息")
            Logger.debug(data)
            return False
        
        Logger.success(f"登录{'/注册' if session.is_new_user else ''}成功!")
        Logger.info(f"用户ID: {session.user_id}")
        Logger.info(f"是否新用户: {'是' if session.is_new_user else '否'}")
        Logger.info(f"Access Token: {session.access_token[:20]}...")
        Logger.info(f"Refresh Token: {session.refresh_token[:20]}...")
        
        return True
    except requests.exceptions.RequestException as e:
        Logger.error(f"请求错误: {str(e)}")
        return False
    except Exception as e:
        Logger.error(f"测试登录/注册时出错: {str(e)}")
        return False

def test_token_validation() -> bool:
    """测试令牌验证API"""
    Logger.info("测试令牌验证 API")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/auth/validate",
            headers=get_headers(with_token=True)
        )
        
        if response.status_code != 200:
            Logger.error(f"令牌验证失败，状态码: {response.status_code}")
            Logger.debug(response.json())
            return False
        
        data = response.json()
        Logger.success("令牌验证成功!")
        Logger.debug(data)
        
        return True
    except requests.exceptions.RequestException as e:
        Logger.error(f"请求错误: {str(e)}")
        return False
    except Exception as e:
        Logger.error(f"测试令牌验证时出错: {str(e)}")
        return False

def test_get_current_user() -> bool:
    """测试获取当前用户信息API（需要认证）"""
    Logger.info("测试获取当前用户信息 API (需要认证)")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/users/me",
            headers=get_headers(with_token=True)
        )
        
        if response.status_code != 200:
            Logger.error(f"获取用户信息失败，状态码: {response.status_code}")
            Logger.debug(response.json())
            return False
        
        data = response.json()
        Logger.success("获取用户信息成功!")
        Logger.debug(data)
        
        return True
    except requests.exceptions.RequestException as e:
        Logger.error(f"请求错误: {str(e)}")
        return False
    except Exception as e:
        Logger.error(f"测试获取用户信息时出错: {str(e)}")
        return False

def test_refresh_token() -> bool:
    """测试刷新令牌API"""
    Logger.info("测试刷新令牌 API")
    
    if not session.refresh_token:
        Logger.error("刷新令牌不存在")
        return False
    
    try:
        # 保存旧令牌以便比较
        old_token = session.access_token
        
        refresh_headers = {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
            "Authorization": f"Bearer {session.refresh_token}"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/auth/refresh",
            headers=refresh_headers,
            json={}
        )
        
        if response.status_code != 200:
            Logger.error(f"刷新令牌失败，状态码: {response.status_code}")
            Logger.debug(response.json())
            return False
        
        data = response.json()
        
        if not data.get("accessToken"):
            Logger.error("响应中缺少新的访问令牌")
            Logger.debug(data)
            return False
        
        session.access_token = data.get("accessToken")
        
        Logger.success("令牌刷新成功!")
        Logger.info(f"旧Token: {old_token[:15]}...")
        Logger.info(f"新Token: {session.access_token[:15]}...")
        
        return True
    except requests.exceptions.RequestException as e:
        Logger.error(f"请求错误: {str(e)}")
        return False
    except Exception as e:
        Logger.error(f"测试刷新令牌时出错: {str(e)}")
        return False

def test_with_new_token() -> bool:
    """使用新令牌再次验证"""
    Logger.info("使用新令牌再次调用需要认证的API")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/users/me",
            headers=get_headers(with_token=True)
        )
        
        if response.status_code != 200:
            Logger.error(f"使用新令牌调用API失败，状态码: {response.status_code}")
            Logger.debug(response.json())
            return False
        
        data = response.json()
        Logger.success("使用新令牌调用API成功!")
        Logger.debug(data)
        
        return True
    except requests.exceptions.RequestException as e:
        Logger.error(f"请求错误: {str(e)}")
        return False
    except Exception as e:
        Logger.error(f"使用新令牌测试时出错: {str(e)}")
        return False

def test_logout() -> bool:
    """测试登出API"""
    Logger.info("测试登出 API")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/logout",
            headers=get_headers(with_token=True),
            json={}
        )
        
        if response.status_code != 200:
            Logger.error(f"登出失败，状态码: {response.status_code}")
            Logger.debug(response.json())
            return False
        
        data = response.json()
        Logger.success("登出成功!")
        Logger.debug(data)
        
        return True
    except requests.exceptions.RequestException as e:
        Logger.error(f"请求错误: {str(e)}")
        return False
    except Exception as e:
        Logger.error(f"测试登出时出错: {str(e)}")
        return False

def test_token_invalidation() -> bool:
    """验证登出后令牌是否失效"""
    Logger.info("验证登出后令牌是否失效")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/users/me",
            headers=get_headers(with_token=True)
        )
        
        if response.status_code == 401:
            Logger.success("登出后令牌已失效，验证成功!")
            return True
        else:
            Logger.warn("令牌仍然有效，这可能是个问题!")
            Logger.debug(response.json())
            return False
    except requests.exceptions.RequestException as e:
        Logger.error(f"请求错误: {str(e)}")
        return False
    except Exception as e:
        Logger.error(f"验证令牌失效时出错: {str(e)}")
        return False

def run_tests() -> None:
    """运行所有测试"""
    Logger.info("=== 开始认证流程测试 ===")
    
    # 首先检查服务器是否在运行
    if not check_server_running():
        Logger.error("服务器检查失败，终止测试")
        return
    
    # 测试1: 登录/注册
    if not test_login_or_register():
        Logger.error("登录/注册测试失败，终止后续测试")
        return
    
    # 测试2: 验证令牌
    test_token_validation()
    
    # 测试3: 调用需要认证的API
    test_get_current_user()
    
    # 测试4: 刷新令牌
    if not test_refresh_token():
        Logger.error("刷新令牌测试失败，终止后续测试")
        return
    
    # 测试5: 使用新令牌
    test_with_new_token()
    
    # 测试6: 登出
    if not test_logout():
        Logger.error("登出测试失败，终止后续测试")
        return
    
    # 测试7: 验证令牌失效
    test_token_invalidation()
    
    Logger.info("=== 认证流程测试完成 ===")

# 运行测试
if __name__ == "__main__":
    run_tests()
