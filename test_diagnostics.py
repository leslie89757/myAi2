#!/usr/bin/env python3
import requests
import json
import sys
import time

"""
诊断测试脚本 - 用于检查 Vercel 部署环境变量和数据库连接
"""

# 配置
API_BASE_URL = "https://myai-backend.vercel.app"
API_KEY = "test_key"  # 全局API密钥

# 彩色输出
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

def print_header(message):
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== {message} ==={Colors.ENDC}")

def print_info(message):
    print(f"{Colors.CYAN}[INFO] {message}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}[SUCCESS] {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}[WARNING] {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}[ERROR] {message}{Colors.ENDC}")

def print_json(data):
    json_str = json.dumps(data, indent=2, ensure_ascii=False)
    print(f"{Colors.BLUE}{json_str}{Colors.ENDC}")

def make_request(endpoint, method="GET", data=None):
    url = f"{API_BASE_URL}{endpoint}"
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    print_info(f"请求 {method} {url}")
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        else:
            response = requests.post(url, headers=headers, json=data, timeout=10)
        
        print_info(f"状态码: {response.status_code}")
        return response
    except Exception as e:
        print_error(f"请求失败: {str(e)}")
        return None

def test_server_health():
    print_header("健康检查")
    response = make_request("/health")
    if not response:
        return False
    
    if response.status_code == 200:
        print_success("服务器运行正常")
        print_json(response.json())
        return True
    else:
        print_error(f"健康检查失败: {response.status_code}")
        try:
            print_json(response.json())
        except:
            print_error(f"无法解析响应: {response.text}")
        return False

def test_environment_diagnostics():
    print_header("环境变量诊断")
    response = make_request("/api/diagnostic/environment")
    if not response:
        return
    
    if response.status_code == 200:
        print_success("环境变量诊断成功")
        print_json(response.json())
    else:
        print_error(f"环境变量诊断失败: {response.status_code}")
        try:
            print_json(response.json())
        except:
            print_error(f"无法解析响应: {response.text}")

def test_database_diagnostics():
    print_header("数据库连接诊断")
    response = make_request("/api/diagnostic/database")
    if not response:
        return
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print_success("数据库连接成功")
        else:
            print_error(f"数据库连接失败: {data.get('error')}")
        print_json(data)
    else:
        print_error(f"数据库诊断请求失败: {response.status_code}")
        try:
            print_json(response.json())
        except:
            print_error(f"无法解析响应: {response.text}")

def test_login_with_debug():
    print_header("测试登录(调试)")
    test_user_email = f"test_diag_{int(time.time())}@example.com"
    test_password = "Test@123456"
    
    print_info(f"尝试使用测试账号登录: {test_user_email}")
    
    response = make_request("/api/auth/login", "POST", {
        "login": test_user_email,
        "password": test_password
    })
    
    if not response:
        return
    
    try:
        data = response.json()
        print_json(data)
        
        if data.get("accessToken") and data.get("refreshToken"):
            print_success("登录成功，获取到令牌")
        else:
            print_error("登录响应中缺少令牌信息")
    except Exception as e:
        print_error(f"解析登录响应失败: {str(e)}")
        print_error(f"原始响应: {response.text}")

def main():
    print_header("Vercel 部署诊断工具")
    print_info(f"目标服务器: {API_BASE_URL}")
    
    # 检查服务器健康状态
    if not test_server_health():
        print_error("服务器健康检查失败，终止后续测试")
        return
    
    # 运行诊断测试
    test_environment_diagnostics()
    test_database_diagnostics()
    test_login_with_debug()
    
    print_header("诊断测试完成")
    print_info("如果发现数据库连接问题，请检查以下几点:")
    print_info("1. Vercel环境变量中是否正确配置了DATABASE_URL")
    print_info("2. 数据库服务器是否允许来自Vercel的连接")
    print_info("3. 数据库凭据是否正确")
    print_info("4. 数据库服务是否正常运行")

if __name__ == "__main__":
    main()
