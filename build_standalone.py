# 打包為完全獨立單一檔案 standalone.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

with open('data.js', 'r', encoding='utf-8') as f:
    data_js = f.read()

with open('audio.js', 'r', encoding='utf-8') as f:
    audio_js = f.read()

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# 替換 CSS
html_standalone = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')

# 替換 JS
js_bundle = f"""<script>
// ==================== DATA ====================
{data_js}

// ==================== AUDIO ENGINE ====================
{audio_js}

// ==================== APP CONTROLLER ====================
{app_js}
</script>"""

html_standalone = html_standalone.replace('  <script src="data.js"></script>\n  <script src="audio.js"></script>\n  <script src="app.js"></script>', js_bundle)

with open('standalone.html', 'w', encoding='utf-8') as f:
    f.write(html_standalone)

print("standalone.html generated successfully! File size:", len(html_standalone), "bytes")
