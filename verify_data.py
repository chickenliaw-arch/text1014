import re
import sys

# 設定輸出編碼為 utf-8
sys.stdout.reconfigure(encoding='utf-8')

with open('data.js', 'r', encoding='utf-8') as f:
    code = f.read()

items = re.findall(r'id:\s*["\']([^"\']+)["\']', code)
print(f"Total registered items in data.js: {len(items)}")

depts = re.findall(r'dept:\s*["\']([^"\']+)["\']', code)
print(f"Distinct departments count: {len(set(depts))}")
for d in sorted(set(depts)):
    print(" -", d)

print(f"Total extensions: {len(re.findall(r'extension:\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]', code))}")
if len(items) == len(set(items)):
    print("All IDs are completely unique and verified!")
