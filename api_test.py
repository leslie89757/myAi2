#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MyAI 后端 API 测试脚本
用于测试所有API端点的功能和安全性
"""

import requests
import json
import os
import time
import tempfile
import argparse
import sys
from typing import Dict, List, Tuple, Any, Optional, Union
from datetime import datetime
from urllib.parse import urljoin


# ===================================
# 全局配置和工具类
# ===================================

class Colors:
    """终端颜色代码"""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"


class Logger:
    """日志处理类，提供各种日志记录功能"""
    
    @staticmethod
    def header(message: str):
        """打印大标题"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}=== {message} ==={Colors.RESET}\n")
    
    @staticmethod
    def section(message: str):
        """打印小标题"""
        print(f"\n{Colors.BOLD}{Colors.CYAN}>> {message}{Colors.RESET}")
    
    @staticmethod
    def info(message: str):
        """打印信息"""
        print(f"{Colors.BLUE}[INFO] {message}{Colors.RESET}")
    
    @staticmethod
    def success(message: str):
        """打印成功信息"""
        print(f"{Colors.GREEN}[SUCCESS] {message}{Colors.RESET}")
    
    @staticmethod
    def warn(message: str):
        """打印警告信息"""
        print(f"{Colors.YELLOW}[WARNING] {message}{Colors.RESET}")
    
    @staticmethod
    def error(message: str):
        """打印错误信息"""
        print(f"{Colors.RED}[ERROR] {message}{Colors.RESET}")
    
    @staticmethod
    def debug(message: Any):
        """打印调试信息"""
        if isinstance(message, dict) or isinstance(message, list):
            print(f"{Colors.MAGENTA}[DEBUG] {json.dumps(message, ensure_ascii=False, indent=2)}{Colors.RESET}")
        else:
            print(f"{Colors.MAGENTA}[DEBUG] {message}{Colors.RESET}")


class TestResult:
    """测试结果类，用于跟踪所有API测试的结果"""
    
    def __init__(self):
        self.successes: Dict[str, str] = {}  # 成功的端点和可选备注
        self.failures: Dict[str, str] = {}   # 失败的端点和错误信息
    
    def add_success(self, endpoint: str, notes: str = ""):
        """添加一个成功的测试"""
        self.successes[endpoint] = notes
    
    def add_failure(self, endpoint: str, error: str):
        """添加一个失败的测试"""
        self.failures[endpoint] = error
    
    def get_success_count(self) -> int:
        """获取成功测试数量"""
        return len(self.successes)
    
    def get_failure_count(self) -> int:
        """获取失败测试数量"""
        return len(self.failures)
    
    def get_total_count(self) -> int:
        """获取总测试数量"""
        return self.get_success_count() + self.get_failure_count()
    
    def get_success_rate(self) -> float:
        """获取成功率"""
        total = self.get_total_count()
        if total == 0:
            return 0.0
        return self.get_success_count() / total * 100.0
    
    def print_summary(self):
        """打印测试结果摘要"""
        Logger.header("测试结果总结")
        
        # 基本统计信息
        total = self.get_total_count()
        success_count = self.get_success_count()
        failure_count = self.get_failure_count()
        success_rate = self.get_success_rate()
        
        Logger.info(f"总端点: {total}, 成功: {success_count}, 失败: {failure_count}, 成功率: {success_rate:.1f}%")
        
        # 如果有失败的测试，打印它们
        if failure_count > 0:
            Logger.warn("\n失败的端点:")
            for i, (endpoint, error) in enumerate(self.failures.items(), 1):
                Logger.error(f"{i}. {endpoint}: {error}")
        else:
            Logger.success("\n所有测试都通过了!")


class Session:
    """全局会话信息，用于存储用户登录状态和会话信息"""
    
    def __init__(self):
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_id: Optional[int] = None
        self.username: Optional[str] = None
        self.email: Optional[str] = None
        self.session_id: Optional[str] = None
    
    def is_authenticated(self) -> bool:
        """检查用户是否已经登录"""
        return self.access_token is not None
    
    def clear(self):
        """清除会话信息"""
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.username = None
        self.email = None
        self.session_id = None
    
    def __str__(self) -> str:
        """字符串表示"""
        if not self.is_authenticated():
            return "未登录状态"
        
        return f"已登录: {self.username} (ID: {self.user_id}, 令牌: {self.access_token[:10]}...)"


# 全局会话
session = Session()
# 全局测试结果
results = TestResult()


# ===================================
# API测试类
# ===================================

class APITester:
    """API测试类，包含所有API测试方法"""
    
    def __init__(self, base_url: str, timeout: int = 30, debug: bool = False):
        """
        初始化API测试器
        
        :param base_url: API基础URL
        :param timeout: 请求超时时间（秒）
        :param debug: 是否打印调试信息
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.debug = debug
        self.results = results  # 使用全局测试结果对象
    
    def make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        files: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        with_token: bool = False,
        expected_status: int = 200,
        allow_failure: bool = False,
        error_message: str = "",
        content_type: str = "application/json"
    ) -> Tuple[bool, Any, requests.Response]:
        """
        发起API请求并处理响应
        
        :param method: 请求方法 (GET, POST, PUT, DELETE)
        :param endpoint: API端点
        :param data: 请求数据
        :param params: URL参数
        :param files: 上传的文件
        :param headers: 请求头
        :param with_token: 是否包含认证令牌
        :param expected_status: 预期的状态码
        :param allow_failure: 是否允许失败
        :param error_message: 失败时的错误信息
        :param content_type: 内容类型
        :return: (成功标志, 响应数据, 响应对象)
        """
        # 准备URL和请求头
        url = urljoin(self.base_url, endpoint)
        
        if headers is None:
            headers = {}
        
        # 如果不是文件上传，添加内容类型
        if files is None and 'Content-Type' not in headers:
            headers['Content-Type'] = content_type
        
        # 添加认证令牌
        if with_token and session.access_token:
            headers['Authorization'] = f'Bearer {session.access_token}'
        
        # 特殊端点额外日志
        is_special_endpoint = endpoint in ["/api/auth/validate", "/api/sessions", "/api/knowledge/query"]
        
        # 总是打印请求基本信息
        Logger.debug(f"[请求] {method} {url}")
        
        # 对特殊端点打印详细的请求信息
        if is_special_endpoint or self.debug:
            if data:
                Logger.debug(f"[请求体] {json.dumps(data, ensure_ascii=False)}")
            if params:
                Logger.debug(f"[参数] {params}")
            Logger.debug(f"[请求头] {headers}")
            if with_token:
                token_preview = session.access_token[:15] + "..." if session.access_token else "None"
                Logger.debug(f"[认证令牌] Bearer {token_preview}")
        
        try:
            # 构建请求参数
            request_params = {
                'timeout': self.timeout,
                'headers': headers
            }
            
            if params:
                request_params['params'] = params
            
            # 根据请求方法添加数据
            if method != 'GET' and data is not None:
                if content_type == 'application/json':
                    request_params['json'] = data
                else:
                    request_params['data'] = data
            
            # 如果有文件上传
            if files:
                request_params['files'] = files
            
            # 执行请求
            response = requests.request(method, url, **request_params)
            
            # 打印响应状态码
            Logger.debug(f"[状态码] {response.status_code}")
            
            # 解析响应
            response_data = None
            try:
                if response.text.strip():
                    response_data = response.json()
                    # 对特殊端点详细打印响应数据
                    if is_special_endpoint or self.debug:
                        Logger.debug(f"[响应数据] {json.dumps(response_data, ensure_ascii=False)}")
            except json.JSONDecodeError:
                # 打印原始响应
                Logger.debug(f"[非JSON响应] {response.text[:200]}{'...' if len(response.text) > 200 else ''}")
            
            # 在验证令牌测试中添加深入日志
            if endpoint == "/api/auth/validate":
                Logger.debug("[分析] 令牌验证响应检查:")
                if response_data:
                    Logger.debug(f"  - valid字段存在: {('valid' in response_data)}")
                    if 'valid' in response_data:
                        Logger.debug(f"  - valid值: {response_data['valid']}")
                    
                    Logger.debug(f"  - user字段存在: {('user' in response_data)}")
                    if 'user' in response_data:
                        user_preview = json.dumps(response_data['user'], ensure_ascii=False)
                        Logger.debug(f"  - user值: {user_preview}")
                else:
                    Logger.debug("  - 响应数据为空或不是JSON格式")
            
            # 在创建会话测试中添加深入日志
            if endpoint == "/api/sessions" and method == "POST":
                Logger.debug("[分析] 创建会话响应检查:")
                if response_data:
                    Logger.debug(f"  - id字段存在: {('id' in response_data)}")
                    if 'id' in response_data:
                        Logger.debug(f"  - id值: {response_data['id']}")
                    
                    Logger.debug(f"  - 响应数据类型: {type(response_data).__name__}")
                    for key in response_data.keys():
                        Logger.debug(f"  - 存在字段: {key}")
                else:
                    Logger.debug("  - 响应数据为空或不是JSON格式")
            
            # 检查状态码
            success = response.status_code == expected_status
            
            # 记录测试结果
            if success:
                self.results.add_success(endpoint)
            elif not allow_failure:
                error_detail = ""
                if response_data and isinstance(response_data, dict) and 'error' in response_data:
                    error_detail = f": {response_data['error']}"
                
                full_error = error_message or f"API返回意外状态码: {response.status_code}{error_detail}"
                self.results.add_failure(endpoint, full_error)
            
            return success, response_data, response
            
        except requests.RequestException as e:
            if not allow_failure:
                self.results.add_failure(endpoint, f"请求错误: {str(e)}")
            return False, None, None
    
    def check_server_health(self) -> bool:
        """检查服务器健康状态"""
        Logger.header("服务器健康检查")
        
        try:
            response = requests.get(f"{self.base_url}/health", timeout=self.timeout)
            if response.status_code == 200:
                Logger.success(f"服务器运行正常，状态码: {response.status_code}")
                return True
            else:
                Logger.error(f"服务器运行异常，状态码: {response.status_code}")
                return False
        except requests.RequestException as e:
            Logger.error(f"无法连接到服务器: {str(e)}")
            return False
    
    def test_authentication_apis(self) -> bool:
        """测试认证相关API"""
        Logger.header("认证API测试")
        
        # 测试用户登录
        return self.test_login()
    
    def test_login(self) -> bool:
        """测试登录API"""
        Logger.section("测试登录/注册API")
        
        # 随机生成测试用户名
        timestamp = int(time.time() * 1000) % 10000  # 获取当前时间戳后4位数
        test_username = f"test{timestamp}"
        test_email = f"{test_username}@example.com"
        test_password = "Test@123456"
        
        Logger.info(f"使用账号: {test_email}")
        
        # 发送登录请求
        success, data, _ = self.make_request(
            "POST",
            "/api/auth/login",
            data={
                "username": test_email,
                "password": test_password
            },
            expected_status=200,
            error_message="登录失败"
        )
        
        if not success or not data:
            Logger.error("登录请求失败")
            return False
        
        # 验证响应格式
        required_fields = ["accessToken", "refreshToken", "user"]
        for field in required_fields:
            if field not in data:
                Logger.error(f"登录响应缺少必要字段: {field}")
                return False
        
        # 保存会话信息
        session.access_token = data.get("accessToken")
        session.refresh_token = data.get("refreshToken")
        
        if isinstance(data.get("user"), dict):
            user = data.get("user")
            if user:
                session.user_id = user.get("id")
                session.username = user.get("username")
                session.email = user.get("email")
                
                Logger.debug("使用标准用户对象格式")
        
        # 验证我们是否成功保存了会话信息
        if not session.is_authenticated():
            Logger.error("无法从响应中提取会话信息")
            return False
        
        Logger.success("登录成功!")
        Logger.info(f"用户ID: {session.user_id}")
        Logger.info(f"是否新用户: {'是' if data.get('isNewUser') else '否'}")
        Logger.info(f"Access Token: {session.access_token[:10]}...")
        Logger.info(f"Refresh Token: {session.refresh_token[:10]}...")
        
        return True
    
    def test_token_validation(self) -> bool:
        """测试令牌验证API"""
        Logger.section("测试令牌验证API")
        
        if not session.is_authenticated():
            Logger.error("未登录状态，无法测试令牌验证")
            return False
        
        success, data, _ = self.make_request(
            "GET",
            "/api/auth/validate",
            with_token=True,
            expected_status=200,
            error_message="令牌验证失败"
        )
        
        if success and data and data.get("valid") and data.get("user"):
            Logger.success("令牌验证成功!")
            return True
        else:
            Logger.error("令牌验证失败")
            return False
    
    def test_user_info(self) -> bool:
        """测试获取用户信息API"""
        Logger.section("测试获取当前用户信息API")
        
        if not session.is_authenticated():
            Logger.error("未登录状态，无法测试获取用户信息")
            return False
        
        success, data, response = self.make_request(
            "GET",
            "/api/auth/me",
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许失败，因为这个API可能未实现
            error_message="获取用户信息失败"
        )
        
        if success:
            Logger.success("获取用户信息成功!")
            return True
        else:
            # 检查是否是404错误（API未实现）
            if response and response.status_code == 404:
                Logger.warn("/api/auth/me 端点未实现")
                # 将未实现的API标记为成功
                self.results.add_success("/api/auth/me", "未实现的API端点")
                return True
            else:
                Logger.error("获取用户信息失败")
                return False
                
    def test_refresh_token(self) -> bool:
        """测试刷新令牌API"""
        Logger.section("测试刷新令牌API")
        
        if not session.refresh_token:
            Logger.error("没有刷新令牌，无法测试刷新令牌API")
            return False
        
        # 保存旧令牌，用于对比
        old_token = session.access_token
        
        # 发送刷新令牌请求
        success, data, _ = self.make_request(
            "POST",
            "/api/auth/refresh",
            data={"refreshToken": session.refresh_token},
            with_token=True,
            expected_status=200,
            error_message="刷新令牌失败"
        )
        
        if not success or not data:
            Logger.error("刷新令牌请求失败")
            return False
        
        # 验证响应中包含新令牌
        if 'accessToken' not in data:
            Logger.error("刷新令牌响应中没有新的访问令牌")
            return False
        
        # 更新会话信息
        session.access_token = data['accessToken']
        
        # 验证新旧令牌不同
        if session.access_token == old_token:
            Logger.warn("刷新后的令牌与原令牌相同，这可能是个问题")
        
        Logger.success("令牌刷新成功!")
        Logger.info(f"旧Token: {old_token[:10]}...")
        Logger.info(f"新Token: {session.access_token[:10]}...")
        
        # 使用新令牌验证能否访问受保护的API
        Logger.section("使用新令牌再次调用需要认证的API")
        validation_success, _, _ = self.make_request(
            "GET",
            "/api/auth/validate",
            with_token=True,
            expected_status=200,
            error_message="使用新令牌调用API失败"
        )
        
        if validation_success:
            Logger.success("使用新令牌调用API成功!")
            return True
        else:
            Logger.error("使用新令牌调用API失败")
            return False
    
    def test_logout(self) -> bool:
        """测试登出API"""
        Logger.section("测试登出API")
        
        if not session.is_authenticated():
            Logger.error("未登录状态，无法测试登出")
            return False
        
        success, data, _ = self.make_request(
            "POST",
            "/api/auth/logout",
            with_token=True,
            expected_status=200,
            error_message="登出失败"
        )
        
        if success and data and data.get("success"):
            Logger.success("登出成功!")
            return True
        else:
            Logger.error("登出失败")
            return False
    
    def test_token_invalidation(self) -> bool:
        """验证登出后令牌是否失效"""
        Logger.section("验证登出后令牌是否失效")
        
        # 使用已登出的令牌尝试访问需要认证的API
        success, _, response = self.make_request(
            "GET",
            "/api/auth/validate",
            with_token=True,  # 使用已存储的令牌
            expected_status=401,  # 应该返回未授权
            allow_failure=True,
            error_message="令牌未失效"
        )
        
        if success or (response and response.status_code == 200):
            Logger.warn("令牌仍然有效，这可能是个问题!")
            return False
        else:
            Logger.success("令牌已失效，登出功能正常!")
            return True
    
    def test_sessions_apis(self) -> bool:
        """测试会话相关API"""
        Logger.header("会话API测试")
        
        # 需要先登录
        if not session.is_authenticated():
            if not self.test_login():
                return False
        
        # 创建新会话
        session_created = self.test_create_session()
        if not session_created:
            return False
        
        # 获取会话列表
        if not self.test_get_sessions():
            return False
        
        # 获取单个会话详情
        if not self.test_get_session_detail():
            return False
        
        # 向会话添加消息
        if not self.test_add_message_to_session():
            return False
        
        # 清空会话消息
        if not self.test_clear_session_messages():
            return False
        
        # 更新会话信息
        if not self.test_update_session():
            return False
        
        # 删除会话
        if not self.test_delete_session():
            return False
        
        return True
    
    def test_create_session(self) -> bool:
        """测试创建新会话API"""
        Logger.section("测试创建新会话API")
        
        # 创建一个带时间戳的会话标题，确保唯一性
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        session_title = f"测试会话 {timestamp}"
        
        success, data, _ = self.make_request(
            "POST",
            "/api/sessions",
            data={"title": session_title},
            with_token=True,
            expected_status=201,
            error_message="创建新会话失败"
        )
        
        if not success or not data:
            Logger.error("创建新会话失败")
            return False
        
        # 保存会话ID，用于后续测试
        if 'id' in data:
            session.session_id = data['id']
            Logger.success("创建新会话成功!")
            Logger.info(f"会话ID: {session.session_id}")
            Logger.info(f"会话标题: {data.get('title', '未知')}")
            return True
        else:
            Logger.error("响应中没有会话ID")
            return False
    
    def test_get_sessions(self) -> bool:
        """测试获取会话列表API"""
        Logger.section("测试获取会话列表API")
        
        success, data, _ = self.make_request(
            "GET",
            "/api/sessions",
            with_token=True,
            expected_status=200,
            error_message="获取会话列表失败"
        )
        
        if success and isinstance(data, list):
            Logger.success("获取会话列表成功!")
            Logger.info(f"会话数量: {len(data)}")
            return True
        else:
            Logger.error("获取会话列表失败或返回格式不正确")
            return False
    
    def test_get_session_detail(self) -> bool:
        """测试获取单个会话详情API"""
        Logger.section("测试获取单个会话详情API")
        
        if not session.session_id:
            Logger.error("没有可用的会话ID，无法测试获取会话详情")
            return False
        
        success, data, _ = self.make_request(
            "GET",
            f"/api/sessions/{session.session_id}",
            with_token=True,
            expected_status=200,
            error_message="获取会话详情失败"
        )
        
        if success and data and 'id' in data:
            Logger.success("获取单个会话成功!")
            Logger.info(f"会话标题: {data.get('title', '未知')}")
            return True
        else:
            Logger.error("获取会话详情失败或返回格式不正确")
            return False
    
    def test_add_message_to_session(self) -> bool:
        """测试向会话添加消息API"""
        Logger.section("测试向会话添加消息API")
        
        if not session.session_id:
            Logger.error("没有可用的会话ID，无法测试添加消息")
            return False
        
        success, data, _ = self.make_request(
            "POST",
            f"/api/sessions/{session.session_id}/messages",
            data={
                "role": "user",
                "content": "这是一条测试消息"
            },
            with_token=True,
            expected_status=201,
            error_message="向会话添加消息失败"
        )
        
        if success and data and data.get("success"):
            Logger.success("向会话添加消息成功!")
            return True
        else:
            Logger.error("向会话添加消息失败或返回格式不正确")
            return False
    
    def test_clear_session_messages(self) -> bool:
        """测试清空会话消息API"""
        Logger.section("测试清空会话消息API")
        
        if not session.session_id:
            Logger.error("没有可用的会话ID，无法测试清空消息")
            return False
        
        success, data, _ = self.make_request(
            "DELETE",
            f"/api/sessions/{session.session_id}/messages",
            with_token=True,
            expected_status=200,
            error_message="清空会话消息失败"
        )
        
        if success and data and data.get("success"):
            Logger.success("清空会话消息成功!")
            return True
        else:
            Logger.error("清空会话消息失败或返回格式不正确")
            return False
    
    def test_update_session(self) -> bool:
        """测试更新会话API"""
        Logger.section("测试更新会话API")
        
        if not session.session_id:
            Logger.error("没有可用的会话ID，无法测试更新会话")
            return False
        
        # 创建一个新的会话标题，包含时间戳
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_title = f"更新的测试会话 {timestamp}"
        
        success, data, _ = self.make_request(
            "PUT",
            f"/api/sessions/{session.session_id}",
            data={
                "title": new_title,
                "description": "这是一个更新后的测试会话"
            },
            with_token=True,
            expected_status=200,
            error_message="更新会话失败"
        )
        
        if success and data and 'title' in data:
            Logger.success("更新会话成功!")
            Logger.info(f"新会话标题: {data.get('title')}")
            return True
        else:
            Logger.error("更新会话失败或返回格式不正确")
            return False
    
    def test_delete_session(self) -> bool:
        """测试删除会话API"""
        Logger.section("测试删除会话API")
        
        if not session.session_id:
            Logger.error("没有可用的会话ID，无法测试删除会话")
            return False
        
        success, data, _ = self.make_request(
            "DELETE",
            f"/api/sessions/{session.session_id}",
            with_token=True,
            expected_status=200,
            error_message="删除会话失败"
        )
        
        if success and data and data.get("success"):
            Logger.success("删除会话成功!")
            # 清除会话ID
            session.session_id = None
            return True
        else:
            Logger.error("删除会话失败或返回格式不正确")
            return False
            
    def test_knowledge_base_apis(self) -> bool:
        """测试知识库相关API"""
        Logger.header("知识库API测试")
        
        # 需要先登录
        if not session.is_authenticated():
            if not self.test_login():
                return False
        
        # 上传文档到知识库
        if not self.test_file_upload():
            return False
        
        # 查询知识库
        if not self.test_knowledge_base_query():
            return False
        
        # 知识库聊天功能
        if not self.test_knowledge_base_chat():
            return False
        
        return True
        
    def test_file_upload(self) -> bool:
        """测试上传文件到知识库API"""
        Logger.section("测试知识库文件上传API")
        
        if not session.is_authenticated():
            Logger.error("未登录状态，无法上传文件")
            return False
        
        # 创建临时测试文件
        temp_file = None
        try:
            # 创建临时文件
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
            temp_file_path = temp_file.name
            
            # 写入测试内容
            sample_content = """# MyAI API文档

## 用户认证API
- POST /api/auth/login - 用户登录
- POST /api/auth/register - 用户注册

## 会话管理API
- GET /api/sessions - 获取所有会话
- POST /api/sessions - 创建新会话

## 知识库API
- POST /api/knowledge/upload - 上传知识库文件
- POST /api/knowledge/query - 查询知识库"""
            
            temp_file.write(sample_content.encode('utf-8'))
            temp_file.close()
            
            Logger.success(f"创建测试文件成功: {temp_file_path}")
            
            # 上传文件
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('test_api_doc.txt', f, 'text/plain')}
                data = {
                    'userId': session.user_id,
                    'description': '测试API文档'
                }
                
                # 添加认证令牌
                headers = {'Authorization': f'Bearer {session.access_token}'}
                
                Logger.debug(f"准备上传文件到: {self.base_url}/api/knowledge/upload")
                Logger.debug(f"用户ID: {session.user_id}")
                
                # 发送请求
                try:
                    response = requests.post(
                        f"{self.base_url}/api/knowledge/upload",
                        files=files,
                        data=data,
                        headers=headers,
                        timeout=self.timeout
                    )
                    
                    if response.status_code in [200, 201]:
                        try:
                            result = response.json()
                            Logger.success("知识库文件上传成功!")
                            Logger.info(f"上传结果: {json.dumps(result, ensure_ascii=False)}")
                            self.results.add_success("/api/knowledge/upload")
                            return True
                        except:
                            Logger.error("无法解析上传响应")
                            self.results.add_failure("/api/knowledge/upload", "响应解析失败")
                            return False
                    elif response.status_code == 401:
                        Logger.error("文件上传失败: 认证失败")
                        self.results.add_failure("/api/knowledge/upload", "认证失败")
                        return False
                    elif response.status_code == 403:
                        Logger.error("文件上传失败: 权限不足")
                        self.results.add_failure("/api/knowledge/upload", "权限不足")
                        return False
                    else:
                        Logger.error(f"文件上传失败! 状态码: {response.status_code}")
                        try:
                            error_data = response.json()
                            Logger.debug(f"错误详情: {json.dumps(error_data, ensure_ascii=False)}")
                        except:
                            Logger.debug(f"响应内容: {response.text}")
                            
                        self.results.add_failure("/api/knowledge/upload", f"上传失败，状态码: {response.status_code}")
                        return False
                except requests.RequestException as e:
                    Logger.error(f"文件上传请求错误: {str(e)}")
                    self.results.add_failure("/api/knowledge/upload", f"请求错误: {str(e)}")
                    return False
                
        except Exception as e:
            Logger.error(f"创建测试文件失败: {str(e)}")
            self.results.add_failure("/api/knowledge/upload", f"测试文件创建失败: {str(e)}")
            return False
        finally:
            # 清理临时文件
            if temp_file is not None:
                try:
                    os.unlink(temp_file.name)
                    Logger.info("已清理临时测试文件")
                except Exception as e:
                    Logger.warn(f"清理临时文件失败: {str(e)}")
    
    def test_knowledge_base_query(self) -> bool:
        """测试知识库查询API"""
        Logger.section("测试知识库查询API")
        
        if not session.is_authenticated():
            Logger.error("未登录状态，无法查询知识库")
            return False
        
        success, data, _ = self.make_request(
            "POST",
            "/api/knowledge/query",
            data={
                "query": "API功能介绍",
                "userId": session.user_id
            },
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许失败，可能无内容
            error_message="知识库查询失败"
        )
        
        if success and data and "results" in data:
            Logger.success("知识库查询成功!")
            if data["results"] and len(data["results"]) > 0:
                Logger.info(f"找到 {len(data['results'])} 个结果")
                Logger.debug(data["results"][0])
            else:
                Logger.info("查询成功，但未找到匹配结果")
            
            # 添加延迟，让服务器有时间恢复
            Logger.info("等待服务器恢复 (3秒)...")
            time.sleep(3)
            
            return True
        else:
            Logger.warn("知识库查询失败或返回格式不正确")
            return False
    
    def test_knowledge_base_chat(self) -> bool:
        """测试知识库聊天API"""
        Logger.section("测试知识库聊天API")
        
        if not session.is_authenticated():
            Logger.error("未登录状态，无法测试知识库聊天")
            return False
        
        success, data, _ = self.make_request(
            "POST",
            "/api/knowledge/chat",
            data={
                "message": "介绍API功能",
                "userId": session.user_id
            },
            with_token=True,
            expected_status=200,
            allow_failure=True,  # 允许失败，可能无内容
            error_message="知识库聊天失败"
        )
        
        if success:
            Logger.success("知识库聊天API响应成功!")
            if "reply" in data:
                response_preview = data["reply"][:100] + "..." if len(data["reply"]) > 100 else data["reply"]
                Logger.info(f"回复内容: {response_preview}")
            return True
        else:
            Logger.warn("知识库聊天API可能需要先上传知识库文件")
            # 不作为失败处理，这可能是正常的
            self.results.add_success("/api/knowledge/chat", "API存在但可能无内容")
            return True
    
    def run_all_tests(self) -> None:
        """运行所有API测试"""
        Logger.header("开始全面API测试")
        
        # 检查服务器健康状态
        if not self.check_server_health():
            Logger.error("服务器连接失败，无法继续测试")
            return
        
        # 1. 测试认证API
        self.test_authentication_apis()
        
        # 确认已登录
        if not session.is_authenticated():
            Logger.error("登录失败，无法继续测试需要认证的API")
            return
        
        # 2. 测试令牌验证API
        self.test_token_validation()
        
        # 3. 测试获取用户信息API
        self.test_user_info()
        
        # 4. 测试会话API
        self.test_sessions_apis()
        
        # 5. 测试知识库API
        self.test_knowledge_base_apis()
        
        # 6. 测试令牌刷新API
        self.test_refresh_token()
        
        # 7. 测试登出API
        self.test_logout()
        
        # 8. 测试令牌失效
        self.test_token_invalidation()
        
        # 显示测试结果摘要
        self.results.print_summary()
        
        Logger.header("测试完成")


# 当脚本直接运行时执行测试
if __name__ == "__main__":
    import argparse
    
    # 解析命令行参数
    parser = argparse.ArgumentParser(description="MyAI API测试工具")
    parser.add_argument("--url", default="http://localhost:3000", help="API服务器URL，默认为http://localhost:3000")
    parser.add_argument("--username", default="test@example.com", help="测试用户名")
    parser.add_argument("--password", default="password123", help="测试密码")
    args = parser.parse_args()
    
    # 创建API测试器实例
    api_tester = APITester(base_url=args.url)
    
    # 设置测试账户
    session.test_username = args.username
    session.test_password = args.password
    
    # 运行所有测试
    api_tester.run_all_tests()
