# 安全说明

[English](SECURITY.md) · **简体中文**

## 报告漏洞

请通过维护者公布的安全联系渠道私下报告，不要在公开 Issue 中附带可执行的恶意文档或个人文件。报告应包含影响版本、复现步骤、最小样本和潜在影响。

## 当前安全边界

- Renderer 启用 context isolation、Node integration 关闭和 sandbox。
- 文件与图片访问必须经过主进程 IPC 和文档所有权校验。
- 相对图片禁止路径逃逸，绝对路径必须由用户选择授权。
- 原始 HTML 经净化；脚本、iframe、事件属性和危险 URL 不执行。
- Mermaid 使用 strict 模式，生成的 SVG 再次净化。
- 外部文件修改通过哈希比较阻止静默覆盖，保存使用同目录原子替换。
- 未保存恢复快照以本机用户权限存放在应用的 Application Support 恢复目录，敏感文档使用者应评估本机磁盘加密与账户权限。

## 下载与发布安全

预发布 DMG 使用 ad-hoc 签名，未经 Apple Developer ID 签名与公证，文件名包含 `unsigned`。下载后必须核对 `SHA256SUMS.txt`，并在安装前阅读发布说明。不要关闭 Gatekeeper 或降低系统安全设置。

稳定版发布工作流在缺少证书或公证密钥时直接失败，不生成冒充稳定版的未签名包。

证书、API 密钥、公证密钥和访问令牌只能存放在本机钥匙串或 CI Secrets 中，不得提交到仓库。
