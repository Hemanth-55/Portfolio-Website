// Tiny, safe Markdown → HTML (escapes everything first). Supports headings, lists, tables, bold, italics.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_(.+?)_(?=[\s).,]|$)/g, '$1<em>$2</em>')

export function md(src: string): string {
  const lines = src.replace(/\r/g, '').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    const h = l.match(/^(#{1,3})\s+(.*)/)
    if (h) { out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); i++; continue }
    if (l.trim().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells)
        i++
      }
      const [head, ...body] = rows
      out.push(`<div class="tablewrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      continue
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordered = /^\s*\d+\./.test(l)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '')); i++ }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) { para.push(lines[i]); i++ }
    out.push(`<p>${inline(para.join(' '))}</p>`)
  }
  return out.join('\n')
}
