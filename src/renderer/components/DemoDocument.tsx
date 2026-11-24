export const demoMarkdown = `# 让写作回到文档本身

一个好的编辑器，不该要求你先管理一个仓库。打开文件，阅读，继续写——其余事情都不该挡路。

> 默认呈现内容，而不是呈现语法。
> 需要时，源码始终只差一次点击。

## 清晰，也保持效率

\`\`\`ts
const document = await openFile(path)
editor.focus({ preserveCursor: true })
\`\`\`
`

export function DemoDocument() {
  return (
    <article className="document-page">
      <div className="document-eyebrow">PRODUCT NOTES · NOVEMBER</div>
      <h1>让写作回到文档本身</h1>
      <p>一个好的编辑器，不该要求你先管理一个仓库。打开文件，阅读，继续写——其余事情都不该挡路。</p>
      <blockquote><p>默认呈现内容，而不是呈现语法。<br />需要时，源码始终只差一次点击。</p></blockquote>
      <h2>清晰，也保持效率</h2>
      <div className="code-block">
        <div className="code-heading"><span>TypeScript</span><button type="button">复制</button></div>
        <pre><code><span className="code-keyword">const</span> document = <span className="code-keyword">await</span> <span className="code-function">openFile</span>(path){'\n'}editor.<span className="code-function">focus</span>({'{'} preserveCursor: <span className="code-string">true</span> {'}'})</code></pre>
      </div>
      <h2>文件，就是文件</h2>
      <p>没有导入步骤，没有隐藏数据库。你的内容始终保存在你选择的 Markdown 文件中。</p>
    </article>
  )
}
