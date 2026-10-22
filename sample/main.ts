import { ClassicEditor, CodeBlock, Essentials, Heading, Paragraph } from 'ckeditor5';
import rust from 'highlight.js/lib/languages/rust';
import 'ckeditor5/ckeditor5.css';

import { CodeBlockSyntaxHighlight } from '../src/index.js';
import '../theme/codeblocksyntaxhighlight.css';

const initialData = `
<h2>JavaScript</h2>
<pre><code class="language-javascript">// Greets everyone on the list.
const names = ['Ada', 'Grace'];

for (const name of names) {
  console.log(\`Hello, \${name}!\`);
}</code></pre>
<h2>Python</h2>
<pre><code class="language-python">def fib(n: int) -> int:
    """Return the n-th Fibonacci number."""
    return n if n < 2 else fib(n - 1) + fib(n - 2)</code></pre>
<h2>HTML</h2>
<pre><code class="language-html">&lt;a href="https://ckeditor.com" class="link"&gt;CKEditor&lt;/a&gt;</code></pre>
<h2>Rust, added through the <code>grammars</code> option</h2>
<pre><code class="language-rust">fn main() {
    let answer: u32 = 42;
    println!("{answer}");
}</code></pre>
<h2>Diff</h2>
<pre><code class="language-diff">- const legacy = true;
+ const modern = true;</code></pre>
`;

const editor = await ClassicEditor.create(document.querySelector<HTMLElement>('#editor')!, {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Heading, CodeBlock, CodeBlockSyntaxHighlight],
  toolbar: ['heading', '|', 'codeBlock', '|', 'undo', 'redo'],
  codeBlock: {
    languages: [
      { language: 'plaintext', label: 'Plain text' },
      { language: 'javascript', label: 'JavaScript' },
      { language: 'python', label: 'Python' },
      { language: 'html', label: 'HTML' },
      { language: 'rust', label: 'Rust' },
      { language: 'diff', label: 'Diff' },
    ],
  },
  codeBlockSyntaxHighlight: {
    grammars: { rust },
  },
  initialData,
});

Object.assign(window, { editor });
