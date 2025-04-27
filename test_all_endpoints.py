#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
全面API测试脚本: 测试myai-backend所有主要API端点
包括: 认证API, 用户API, 聊天API, 知识库API, 会话API等
记录详细错误日志以便针对性解决问题
"""

import os
import json
import random
import time
import requests
import argparse
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple, Union
from pathlib import Path

# 配置 - 优先使用环境变量或命令行参数
DEFAULT_API_URL = "https://myai-backend.vercel.app"
API_KEY = "test_key"  # 全局API密钥
DEFAULT_TIMEOUT = 10  # 默认请求超时时间(秒)

# 测试用户账号
TEST_USER = {
    "login": f"test{random.randint(1000, 9999)}@example.com",
    "password": "Test@123456"
}

# 存储会话状态
class SessionState:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.is_new_user = False
        self.chat_session_id = None
        self.messages = []
        self.knowledge_file_id = None
        
# 初始化会话
session = SessionState()

# 颜色代码
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# 日志工具
class Logger:
    @staticmethod
    def header(msg: str) -> None:
        print(f"\n{Colors.HEADER}{Colors.BOLD}=== {msg} ==={Colors.ENDC}")
    
    @staticmethod
    def info(msg: str) -> None:
        print(f"{Colors.CYAN}[INFO] {msg}{Colors.ENDC}")
    
    @staticmethod
    def success(msg: str) -> None:
        print(f"{Colors.GREEN}[SUCCESS] {msg}{Colors.ENDC}")
    
    @staticmethod
    def warn(msg: str) -> None:
        print(f"{Colors.YELLOW}[WARNING] {msg}{Colors.ENDC}")
    
    @staticmethod
    def error(msg: str) -> None:
        print(f"{Colors.RED}[ERROR] {msg}{Colors.ENDC}")
    
    @staticmethod
    def debug(obj: Any) -> None:
        content = obj
        if not isinstance(obj, str):
            try:
                content = json.dumps(obj, ensure_ascii=False, indent=2)
            except:
                content = str(obj)
        print(f"{Colors.BLUE}[DEBUG] {content}{Colors.ENDC}")
    
    @staticmethod
    def section(msg: str) -> None:
        print(f"\n{Colors.BOLD}{Colors.CYAN}>> {msg}{Colors.ENDC}")

    @staticmethod
    def subsection(msg: str) -> None:
        print(f"{Colors.YELLOW}> {msg}{Colors.ENDC}")

# 记录测试结果
class TestResults:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_success(self, endpoint: str) -> None:
        self.total += 1
        self.passed += 1
    
    def add_failure(self, endpoint: str, error: str) -> None:
        self.total += 1
        self.failed += 1
        self.errors.append({"endpoint": endpoint, "error": error})
    
    def summary(self) -> str:
        success_rate = (self.passed / self.total) * 100 if self.total > 0 else 0
        return (
            f"总端点: {self.total}, 成功: {self.passed}, 失败: {self.failed}, "
            f"成功率: {success_rate:.1f}%"
        )
    
    def get_failures(self) -> str:
        if not self.errors:
            return "无失败测试"
        
        result = "\n失败的端点:"
        for i, err in enumerate(self.errors, 1):
            result += f"\n{i}. {err['endpoint']}: {err['error']}"
        return result

# 获取HTTP请求头
def get_headers(with_token: bool = False) -> Dict[str, str]:
    """获取HTTP请求头, 始终包含API密钥头"""
    headers = {
        "Content-Type": "application/json", 
        "X-API-Key": API_KEY  # 重要: 此项目需要API密钥认证
    }
    
    if with_token and session.access_token:
        headers["Authorization"] = f"Bearer {session.access_token}"
    
    return headers

# 记录请求和响应细节
def log_request_details(method: str, url: str, data: Optional[Dict] = None, headers: Optional[Dict] = None) -> None:
    Logger.debug(f"请求: {method} {url}")
    if data:
        Logger.debug(f"请求体: {json.dumps(data, ensure_ascii=False)}")
    
    # 不输出完整的授权头，但显示是否存在
    if headers:
        safe_headers = headers.copy()
        if "Authorization" in safe_headers:
            safe_headers["Authorization"] = f"{safe_headers['Authorization'][:15]}..."
        Logger.debug(f"请求头: {safe_headers}")

# 记录响应细节
def log_response_details(response) -> None:
    Logger.debug(f"状态码: {response.status_code}")
    try:
        Logger.debug(response.json())
    except:
        Logger.debug(f"非JSON响应: {response.text[:200]}...")

# 测试用的通用函数
class APITester:
    def __init__(self, base_url: str, timeout: int = DEFAULT_TIMEOUT):
        self.base_url = base_url
        self.timeout = timeout
        self.results = TestResults()
    
    def make_request(self, 
                     method: str, 
                     endpoint: str, 
                     data: Optional[Dict] = None, 
                     with_token: bool = False,
                     expected_status: int = 200,
                     allow_failure: bool = False,
                     error_message: str = ""
                     ) -> Tuple[bool, Optional[Dict], Optional[requests.Response]]:
        """
        通用请求处理方法，返回(成功标志, 响应数据, 响应对象)
        """
        url = f"{self.base_url}{endpoint}"
        headers = get_headers(with_token)
        
        log_request_details(method, url, data, headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=self.timeout)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=self.timeout)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=self.timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, json=data, timeout=self.timeout)
            else:
                return False, None, None
            
            log_response_details(response)
            
            if response.status_code != expected_status and not allow_failure:
                error_msg = error_message or f"状态码 {response.status_code} 与预期 {expected_status} 不符"
                self.results.add_failure(endpoint, error_msg)
                try:
                    error_details = response.json()
                    if isinstance(error_details, dict) and "error" in error_details:
                        error_msg += f": {error_details['error']}"
                except:
                    error_msg += f": {response.text[:100]}"
                    
                Logger.error(error_msg)
                return False, None, response
            
            try:
                data = response.json()
                self.results.add_success(endpoint)
                return True, data, response
            except:
                if not allow_failure:
                    error_msg = "响应不是有效的JSON格式"
                    self.results.add_failure(endpoint, error_msg)
                    Logger.error(error_msg)
                return False, None, response
                
        except requests.exceptions.RequestException as e:
            error_msg = f"请求错误: {str(e)}"
            self.results.add_failure(endpoint, error_msg)
            Logger.error(error_msg)
            return False, None, None
        except Exception as e:
            error_msg = f"测试时发生异常: {str(e)}"
            self.results.add_failure(endpoint, error_msg)
            Logger.error(error_msg)
            return False, None, None

    def test_health(self) -> bool:
        """测试健康检查端点"""
        Logger.section("健康检查")
        
        success, data, _ = self.make_request(
            "GET", "/health", 
            expected_status=200,
            error_message="健康检查失败"
        )
        
        if success and data.get("status") == "ok":
            Logger.success("服务器健康状态: 正常")
            return True
        else:
            Logger.error("服务器健康状态异常")
            return False

    def test_login(self) -> bool:
        """测试登录/注册API"""
        Logger.section("测试登录/注册API")
        Logger.info(f"使用账号: {TEST_USER['login']}")
        
        success, data, _ = self.make_request(
            "POST", "/api/auth/login", 
            data=TEST_USER,
            expected_status=200,
            error_message="登录/注册失败"
        )
        
        if not success:
            return False
        
        # 检查响应中是否包含令牌
        if not data.get("accessToken") or not data.get("refreshToken"):
            Logger.error("响应中缺少令牌信息")
            self.results.add_failure("/api/auth/login", "缺少令牌信息")
            return False
        
        # 保存会话信息
        session.access_token = data.get("accessToken")
        session.refresh_token = data.get("refreshToken")
        session.user_id = data.get("user", {}).get("id")
        session.is_new_user = data.get("isNewUser", False)
        
        Logger.success("登录成功!")
        Logger.info(f"用户ID: {session.user_id}")
        Logger.info(f"是否新用户: {'是' if session.is_new_user else '否'}")
        Logger.info(f"Access Token: {session.access_token[:15]}...")
        Logger.info(f"Refresh Token: {session.refresh_token[:15]}...")
        
        return True

    def test_validate_token(self) -> bool:
        """测试令牌验证API"""
        Logger.section("测试令牌验证API")
        
        if not session.access_token:
            Logger.error("没有访问令牌，跳过验证")
            return False
        
        success, data, _ = self.make_request(
            "GET", "/api/auth/validate", 
            with_token=True,
            expected_status=200,
            error_message="令牌验证失败"
        )
        
        if success and data.get("valid"):
            Logger.success("令牌验证成功!")
            return True
        else:
            Logger.error("令牌验证失败")
            return False

    def test_get_current_user(self) -> bool:
        """测试获取当前用户信息API"""
        Logger.section("测试获取当前用户信息API")
        
        if not session.access_token:
            Logger.error("没有访问令牌，跳过获取用户信息")
            return False
        
        success, data, _ = self.make_request(
            "GET", "/api/users/me", 
            with_token=True,
            expected_status=200,
            error_message="获取用户信息失败"
        )
        
        if success and data:
            Logger.success("获取用户信息成功!")
            return True
        else:
            Logger.error("获取用户信息失败")
            return False

    def test_refresh_token(self) -> bool:
        """测试刷新令牌API"""
        Logger.section("测试刷新令牌API")
        
        if not session.refresh_token:
            Logger.error("没有刷新令牌，跳过测试")
            return False
        
        # 暂存旧令牌以便比较
        old_token = session.access_token
        
        # 修改请求头，使用刷新令牌
        custom_headers = get_headers()
        custom_headers["Authorization"] = f"Bearer {session.refresh_token}"
        
        log_request_details("POST", f"{self.base_url}/api/auth/refresh", headers=custom_headers)
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/refresh",
                headers=custom_headers,
                timeout=self.timeout
            )
            
            log_response_details(response)
            
            if response.status_code != 200:
                error_msg = f"刷新令牌失败，状态码: {response.status_code}"
                self.results.add_failure("/api/auth/refresh", error_msg)
                Logger.error(error_msg)
                return False
            
            data = response.json()
            self.results.add_success("/api/auth/refresh")
            
            if not data.get("accessToken"):
                Logger.error("响应中缺少新的访问令牌")
                self.results.add_failure("/api/auth/refresh", "缺少新的访问令牌")
                return False
            
            session.access_token = data.get("accessToken")
            
            Logger.success("令牌刷新成功!")
            Logger.info(f"旧Token: {old_token[:15]}...")
            Logger.info(f"新Token: {session.access_token[:15]}...")
            
            return True
            
        except Exception as e:
            error_msg = f"刷新令牌时发生错误: {str(e)}"
            self.results.add_failure("/api/auth/refresh", error_msg)
            Logger.error(error_msg)
            return False

    def test_with_new_token(self) -> bool:
        """使用新令牌再次验证"""
        Logger.section("使用新令牌再次调用需要认证的API")
        
        if not session.access_token:
            Logger.error("没有访问令牌，跳过测试")
            return False
        
        success, data, _ = self.make_request(
            "GET", "/api/users/me", 
            with_token=True,
            expected_status=200,
            error_message="使用新令牌调用API失败"
        )
        
        if success:
            Logger.success("使用新令牌调用API成功!")
            return True
        else:
            Logger.error("使用新令牌调用API失败")
            return False

    def test_logout(self) -> bool:
        """测试登出API"""
        Logger.section("测试登出API")
        
        if not session.access_token:
            Logger.error("没有访问令牌，跳过登出测试")
            return False
        
        success, data, _ = self.make_request(
            "POST", "/api/auth/logout", 
            with_token=True,
            expected_status=200,
            error_message="登出失败"
        )
        
        if success and data.get("success"):
            Logger.success("登出成功!")
            return True
        else:
            Logger.error("登出失败")
            return False

    def test_token_invalidation(self) -> bool:
        """验证登出后令牌是否失效"""
        Logger.section("验证登出后令牌是否失效")
        
        if not session.access_token:
            Logger.error("没有访问令牌，跳过验证")
            return False
        
        success, data, response = self.make_request(
            "GET", "/api/users/me", 
            with_token=True,
            expected_status=401,  # 期望401错误
            allow_failure=True,   # 允许失败状态码
            error_message="使用注销后的令牌仍能访问API"
        )
        
        if success or (response and response.status_code == 200):
            Logger.warn("令牌仍然有效，这可能是个问题!")
            return False
        else:
            Logger.success("令牌已失效，登出功能正常!")
            return True
    
    def test_chat_apis(self) -> bool:
        """测试聊天相关API"""
        Logger.header("聊天API测试")
        
        # 简单聊天
        Logger.section("测试简单聊天API")
        success, data, _ = self.make_request(
            "POST", "/api/chat/simple", 
            data={"message": "你好，请介绍一下这个API"},
            with_token=True,
            expected_status=200,
            error_message="发送聊天消息失败"
        )
        
        if not success:
            return False
            
        Logger.success("简单聊天API响应成功!")
        
        # 流式聊天（只测试端点可达性，不测试流内容）
        Logger.section("测试流式聊天API可达性")
        success, _, response = self.make_request(
            "POST", "/api/chat/stream", 
            data={"message": "你好，简单介绍一下"},
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许JSON解析失败
            error_message="流式聊天API不可达"
        )
        
        if response and response.status_code == 200:
            Logger.success("流式聊天API可达!")
            return True
        else:
            Logger.error("流式聊天API不可达")
            return False
    
    def test_knowledge_base_apis(self) -> bool:
        """测试知识库相关API"""
        Logger.header("知识库API测试")
        
        # 知识库查询
        Logger.section("测试知识库查询API")
        success, data, _ = self.make_request(
            "POST", "/api/knowledge/query", 
            data={"query": "API功能介绍", "limit": 3},
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许失败，可能没有知识库内容
            error_message="知识库查询失败"
        )
        
        if success:
            Logger.success("知识库查询API响应成功!")
        else:
            Logger.warn("知识库查询API可能需要先上传知识库文件")
        
        # 知识库聊天
        Logger.section("测试知识库聊天API")
        success, data, _ = self.make_request(
            "POST", "/api/knowledge/chat", 
            data={"message": "介绍API功能", "userId": session.user_id or "test_user"},
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许失败，可能没有知识库内容
            error_message="知识库聊天失败"
        )
        
        if success:
            Logger.success("知识库聊天API响应成功!")
            return True
        else:
            Logger.warn("知识库聊天API可能需要先上传知识库文件")
            return False
    
    def test_sessions_apis(self) -> bool:
        """测试会话相关API"""
        Logger.header("会话API测试")
        
        # 获取所有会话
        Logger.section("测试获取会话列表API")
        success, data, _ = self.make_request(
            "GET", "/api/sessions", 
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许失败
            error_message="获取会话列表失败"
        )
        
        if success:
            Logger.success("获取会话列表成功!")
            
            if isinstance(data, list) and len(data) > 0:
                session.chat_session_id = data[0].get("id")
                Logger.info(f"找到会话ID: {session.chat_session_id}")
        else:
            Logger.warn("获取会话列表失败或返回格式不正确")
        
        # 创建新会话
        Logger.section("测试创建新会话API")
        success, data, _ = self.make_request(
            "POST", "/api/sessions", 
            data={"title": f"测试会话 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"},
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许失败
            error_message="创建新会话失败"
        )
        
        if success and data and "id" in data:
            Logger.success("创建新会话成功!")
            session.chat_session_id = data.get("id")
            Logger.info(f"新会话ID: {session.chat_session_id}")
            return True
        else:
            Logger.warn("创建新会话失败或返回格式不正确")
            return False

    def run_complete_test_suite(self) -> None:
        """运行完整测试套件"""
        Logger.header("开始全面API测试")
        
        # 测试服务健康状态
        if not self.test_health():
            Logger.error("服务器健康检查失败，终止后续测试")
            return
        
        # 认证流程测试
        if not self.test_login():
            Logger.error("登录/注册测试失败，终止后续测试")
            return
            
        self.test_validate_token()
        self.test_get_current_user()
        
        # 聊天API测试
        self.test_chat_apis()
        
        # 知识库API测试
        self.test_knowledge_base_apis()
        
        # 会话API测试
        self.test_sessions_apis()
        
        # 刷新令牌测试
        refresh_result = self.test_refresh_token()
        if refresh_result:
            self.test_with_new_token()
        
        # 登出测试
        logout_result = self.test_logout()
        if logout_result:
            self.test_token_invalidation()
        
        # 测试结果总结
        Logger.header("测试结果总结")
        Logger.info(self.results.summary())
        if self.results.failed > 0:
            Logger.warn(self.results.get_failures())
        else:
            Logger.success("所有测试都通过了!")

# 命令行参数解析
def parse_arguments():
    parser = argparse.ArgumentParser(description='API全面测试工具')
    parser.add_argument('--url', type=str, default=os.environ.get('API_BASE_URL', DEFAULT_API_URL),
                        help=f'API基础URL (默认: {DEFAULT_API_URL})')
    parser.add_argument('--timeout', type=int, default=int(os.environ.get('API_TIMEOUT', DEFAULT_TIMEOUT)),
                        help=f'请求超时时间 (默认: {DEFAULT_TIMEOUT}秒)')
    parser.add_argument('--login-only', action='store_true',
                        help='仅测试登录功能')
    return parser.parse_args()

# 主函数
def main():
    args = parse_arguments()
    
    Logger.header("API测试工具")
    Logger.info(f"目标API: {args.url}")
    Logger.info(f"请求超时: {args.timeout}秒")
    
    # 创建测试器
    tester = APITester(args.url, args.timeout)
    
    # 运行测试
    if args.login_only:
        Logger.info("仅测试登录功能")
        if not tester.test_health():
            Logger.error("服务器健康检查失败，终止测试")
            return
        tester.test_login()
    else:
        tester.run_complete_test_suite()
    
    Logger.header("测试完成")

if __name__ == "__main__":
    main()
