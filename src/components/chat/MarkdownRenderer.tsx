"use client";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderMarkdown = (text: string): string => {
    let html = text ?? "";

    // Code blocks (must come before inline code)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      // Only wrap if not already wrapped in ul
      if (!match.includes('<ul>')) {
        return '<ol>' + match + '</ol>';
      }
      return match;
    });

    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  return (
    <div
      className="markdown-content prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content ?? "") }}
      style={{
        wordBreak: 'break-word',
      }}
    />
  );
}
