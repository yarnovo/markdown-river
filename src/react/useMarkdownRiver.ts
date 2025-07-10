import { useState, useEffect, useRef, useMemo } from 'react';
import parse, { domToReact, HTMLReactParserOptions } from 'html-react-parser';
import { MarkdownRiver } from '../core/MarkdownRiver';
import { MarkdownRiverOptions } from '../types';

interface UseMarkdownRiverReturn {
  write: (chunk: string) => void;
  end: () => void;
  reset: () => void;
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
          const node = domNode as unknown as {
            name: string;
            startIndex?: number;
            attribs?: Record<string, string>;
            children?: unknown[];
          };
          // 为元素生成稳定的 key
          const key = `${node.name}-${node.startIndex || 0}`;

          // 创建 React 元素，保持属性和子元素
          return {
            type: node.name,
            key,
            props: {
              ...node.attribs,
              children: node.children
                ? domToReact(node.children as never[], parserOptions)
                : undefined,
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

  const write = (chunk: string): void => {
    riverRef.current?.write(chunk);
  };

  const end = (): void => {
    riverRef.current?.end();
  };

  const reset = (): void => {
    // 销毁旧实例
    if (riverRef.current) {
      riverRef.current.destroy();
    }

    // 清空状态
    setRawHtml('');

    // 创建新实例
    const river = new MarkdownRiver(options);
    river.on('content:parsed', ({ html }) => {
      setRawHtml(html);
    });
    riverRef.current = river;
  };

  // 使用 html-react-parser 解析 HTML 为 React 元素
  const content = useMemo(() => {
    return rawHtml ? parse(rawHtml, parserOptions) : null;
  }, [rawHtml, parserOptions]);

  return {
    write,
    end,
    reset,
    content,
    rawHtml,
  };
}
