import { useState, useEffect, useRef, useMemo } from 'react';
import parse, { domToReact, HTMLReactParserOptions } from 'html-react-parser';
import { MarkdownRiver } from '../core/MarkdownRiver';
import { MarkdownRiverOptions } from '../types';

interface UseMarkdownRiverReturn {
  write: (chunk: string) => void;
  end: () => void;
  content: React.ReactNode;
  rawHtml: string;
}

export function useMarkdownRiver(options: MarkdownRiverOptions = {}): UseMarkdownRiverReturn {
  const [rawHtml, setRawHtml] = useState('');
  const riverRef = useRef<MarkdownRiver | null>(null);

  // 创建解析选项，用于生成稳定的 React 元素
  const parserOptions: HTMLReactParserOptions = useMemo(
    () => ({
      replace: domNode => {
        if (domNode.type === 'tag' && 'name' in domNode) {
          const node = domNode as any;
          // 为元素生成稳定的 key
          const key = `${node.name}-${node.startIndex || 0}`;

          // 创建 React 元素，保持属性和子元素
          return {
            type: node.name,
            key,
            props: {
              ...node.attribs,
              children: node.children ? domToReact(node.children, parserOptions) : undefined,
            },
          };
        }
        return domNode;
      },
    }),
    []
  );

  useEffect(() => {
    const river = new MarkdownRiver(options);

    river.on('content:parsed', ({ html }) => {
      setRawHtml(html);
    });

    riverRef.current = river;

    return () => {
      river.destroy();
      riverRef.current = null;
    };
  }, []);

  const write = (chunk: string) => {
    riverRef.current?.write(chunk);
  };

  const end = () => {
    riverRef.current?.end();
  };

  // 使用 html-react-parser 解析 HTML 为 React 元素
  const content = useMemo(() => {
    return rawHtml ? parse(rawHtml, parserOptions) : null;
  }, [rawHtml, parserOptions]);

  return {
    write,
    end,
    content,
    rawHtml,
  };
}
