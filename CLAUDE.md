# Markdown River y��

## y��

Markdown River / \*�A HTML 2ӄ�Лz����㐌2���: AI AJ):o��

##  ф Bug �

2025-01-11

### �W�> `</` >:�

**���**
(�W�>SA��( `</pre>` ~-�\*����� `</`  `</pr` ٛ
�t��~>:(�W��-

**9,��**
��(�K�W�� `<pre>` ~p�'� `</pre>` ~p�1�:(�W-SG0
�t� `</pre>` �� `</` �6�S\�W���Y

**㳹H**
( `convertToSafeHtml` ��-��y�

```javascript
// ��(�W-G0� /  4�
�t~
if (this.isInCodeBlock(html.substring(0, lastOpenBracket))) {
  if (afterBracket.match(/^\//)) {
    // ��/ </pre> � ���*�
    return html.substring(0, lastOpenBracket);
  }
  // &< /�W-�nW&
  return html;
}
```

**KՌ�**

- ����K�(� `html-code-block-incomplete-close.json`
- ����\*�ŵ`</``</p``</pr``</pre>`
- n݆�(�h HTML ���M�ы�

## Demo �2025-01-11

### :�t

�e� 5 *��:�t: 1 *�:�hbU: CommonMark �8�iU��

- �,<���S d�L��
- �=�bL
- (W�LW
- h�� ���h
- �W/��خ
- h<
- ��
- HTML �S�y�W&
- �G( Lorem Picsum CDN
- LWӄ

### ��6

- t��: 1-50ms�: 50-300ms
- ؤ��n: 15ms
- Л�AE�:S�

## ��y�

### ��q� API

- `onHtmlUpdate(listener)` - � HTML ���,h
- `write(chunk)` - �e HTML G�
- `reset()` - �n�
- �(�h HTML �E����ы�

### 8×�

�hlb��A

1. �+>�~  \* < &�
2. ��� < � h腹��h
3. �� ��� > � ~�t���h
4. ��(�W-
   - �� < b/ / � ��/ </pre> � �\*�
   - & � < /nW&���h
5. �� < b
   /W� / �
   ��/~���h
6. & � �K:
   �t~\*�0 < KM

## �/

- **8Ó**TypeScript��L��V
- **Demo**React + TypeScript + Vite + Tailwind CSS
- **K�**Vitest + JSON q�� E2E K�
- **��**Rollup
