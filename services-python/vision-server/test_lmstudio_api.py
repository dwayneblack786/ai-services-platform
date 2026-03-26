"""
Test LM Studio API endpoints to verify which API format to use.

Tests both OpenAI-compatible and native LM Studio endpoints.
"""

import requests
import json
from pathlib import Path
import base64

BASE_URL = "http://127.0.0.1:1234"

def test_openai_compatible():
    """Test OpenAI-compatible endpoints (/v1/*)"""
    print("\n" + "="*70)
    print("Testing OpenAI-Compatible API")
    print("="*70)
    
    try:
        # Test models endpoint
        response = requests.get(f"{BASE_URL}/v1/models", timeout=5)
        print(f"\nGET /v1/models")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Success! Models available:")
            if 'data' in data:
                for model in data['data'][:3]:  # Show first 3
                    print(f"  - {model.get('id', 'unknown')}")
            return True
        else:
            print(f"✗ Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_native_api():
    """Test native LM Studio endpoints (/api/v1/*)"""
    print("\n" + "="*70)
    print("Testing Native LM Studio API")
    print("="*70)
    
    try:
        # Test models endpoint
        response = requests.get(f"{BASE_URL}/api/v1/models", timeout=5)
        print(f"\nGET /api/v1/models")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Success! Response:")
            print(f"  {json.dumps(data, indent=2)[:500]}")
            return True
        else:
            print(f"✗ Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_chat_endpoint(use_native=False):
    """Test chat completion endpoint"""
    print("\n" + "="*70)
    print(f"Testing Chat Endpoint ({'Native' if use_native else 'OpenAI-Compatible'})")
    print("="*70)
    
    if use_native:
        url = f"{BASE_URL}/api/v1/chat"
    else:
        url = f"{BASE_URL}/v1/chat/completions"
    
    # Simple text test
    payload = {
        "messages": [
            {"role": "user", "content": "Say 'Hello' if you can hear me."}
        ],
        "temperature": 0.7,
        "max_tokens": 50
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"\nPOST {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'choices' in data:
                content = data['choices'][0].get('message', {}).get('content', '')
                print(f"✓ Success! Response:")
                print(f"  {content}")
            else:
                print(f"✓ Response: {json.dumps(data, indent=2)[:300]}")
            return True
        else:
            print(f"✗ Failed: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_vision_capability(use_native=False):
    """Test vision/image capability"""
    print("\n" + "="*70)
    print(f"Testing Vision Capability ({'Native' if use_native else 'OpenAI-Compatible'})")
    print("="*70)
    
    # Create a tiny test image (1x1 red pixel PNG)
    test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    if use_native:
        url = f"{BASE_URL}/api/v1/chat"
    else:
        url = f"{BASE_URL}/v1/chat/completions"
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What color is this pixel?"},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{test_image_b64}"}}
                ]
            }
        ],
        "temperature": 0.7,
        "max_tokens": 50
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"\nPOST {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'choices' in data:
                content = data['choices'][0].get('message', {}).get('content', '')
                print(f"✓ Success! Vision model responded:")
                print(f"  {content[:200]}")
            else:
                print(f"✓ Response: {json.dumps(data, indent=2)[:300]}")
            return True
        else:
            print(f"✗ Failed: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    print("="*70)
    print("LM Studio API Endpoint Test")
    print("="*70)
    print(f"\nBase URL: {BASE_URL}")
    print("\nMake sure LM Studio is running with a vision model loaded!")
    print()
    input("Press Enter to start tests...")
    
    results = {}
    
    # Test OpenAI-compatible endpoints
    results['openai_models'] = test_openai_compatible()
    results['openai_chat'] = test_chat_endpoint(use_native=False)
    results['openai_vision'] = test_vision_capability(use_native=False)
    
    # Test native endpoints
    results['native_models'] = test_native_api()
    results['native_chat'] = test_chat_endpoint(use_native=True)
    results['native_vision'] = test_vision_capability(use_native=True)
    
    # Summary
    print("\n" + "="*70)
    print("Test Summary")
    print("="*70)
    print("\nOpenAI-Compatible API (/v1/*):")
    print(f"  Models endpoint:  {'✓ Working' if results['openai_models'] else '✗ Failed'}")
    print(f"  Chat endpoint:    {'✓ Working' if results['openai_chat'] else '✗ Failed'}")
    print(f"  Vision support:   {'✓ Working' if results['openai_vision'] else '✗ Failed'}")
    
    print("\nNative LM Studio API (/api/v1/*):")
    print(f"  Models endpoint:  {'✓ Working' if results['native_models'] else '✗ Failed'}")
    print(f"  Chat endpoint:    {'✓ Working' if results['native_chat'] else '✗ Failed'}")
    print(f"  Vision support:   {'✓ Working' if results['native_vision'] else '✗ Failed'}")
    
    # Recommendation
    print("\n" + "="*70)
    print("Recommendation")
    print("="*70)
    
    if results['openai_vision']:
        print("\n✓ Use OpenAI-Compatible API (current implementation)")
        print("  Base URL: http://127.0.0.1:1234/v1")
        print("  Endpoint: /v1/chat/completions")
        print("  Status: Already configured correctly!")
    elif results['native_vision']:
        print("\n✓ Use Native LM Studio API")
        print("  Base URL: http://127.0.0.1:1234")
        print("  Endpoint: /api/v1/chat")
        print("  Status: Code needs to be updated to use native API")
    else:
        print("\n✗ Neither API working - check LM Studio setup:")
        print("  1. Is LM Studio running?")
        print("  2. Is a vision model loaded?")
        print("  3. Is the local server started?")
        print("  4. Check LM Studio settings for API port")
    
    print()


if __name__ == "__main__":
    main()
