
#!/usr/bin/env python3
import requests
import json
import sys
import time

# 测试流式API
def test_stream_api(base_url, access_token, user_id):
    print("
=== 流式API独立测试 ===")
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': f'Bearer {access_token}'
    }
    
    try:
        print(f"
>> 测试知识库流式聊天API")
        print(f"[DEBUG] 请求: POST {base_url}/api/knowledge/stream-chat")
        print(f"[DEBUG] 请求体: {{"message": "流式API测试", "userId": {user_id}}}")
        print(f"[DEBUG] 请求头: {headers}")
        
        response = requests.post(
            f"{base_url}/api/knowledge/stream-chat",
            json={"message": "流式API测试", "userId": user_id},
            headers=headers,
            stream=True,
            timeout=10
        )
        
        print(f"[DEBUG] 状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("[SUCCESS] 流式API连接成功!")
            print("[INFO] 开始接收流数据...")
            
            # 设置超时时间
            start_time = time.time()
            timeout = 5  # 5秒超时
            
            # 读取数据流
            for line in response.iter_lines(decode_unicode=True):
                if line:
                    if line.startswith('data:'):
                        print(f"[DATA] {line}")
                
                # 检查是否超时
                if time.time() - start_time > timeout:
                    print("[INFO] 读取超时，结束测试")
                    break
            
            print("[SUCCESS] 流式API测试完成")
            return True
        else:
            print(f"[ERROR] 流式API请求失败，状态码: {response.status_code}")
            try:
                error_data = response.json()
                print(f"[ERROR] 错误详情: {json.dumps(error_data, ensure_ascii=False)}")
            except:
                pass
            return False
    except Exception as e:
        print(f"[ERROR] 测试流式API时发生错误: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python test_stream_api.py <base_url> <access_token> <user_id>")
        sys.exit(1)
    
    base_url = sys.argv[1]
    access_token = sys.argv[2]
    user_id = sys.argv[3]
    
    success = test_stream_api(base_url, access_token, user_id)
    sys.exit(0 if success else 1)
