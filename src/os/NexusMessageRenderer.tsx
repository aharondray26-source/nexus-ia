import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";
import { Check, Copy, Play, Sparkles } from "lucide-react";
import { useWindows } from "./useWindows";

interface NexusMessageRendererProps {
  content: string;
  isAssistant?: boolean;
  animateWords?: boolean;
}

export const NexusMessageRenderer: React.FC<NexusMessageRendererProps> = ({
  content,
  isAssistant = true,
  animateWords = false,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const openApp = useWindows((s) => s.openApp);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTestCodeInPlayground = (code: string) => {
    openApp("playground", { width: 780, height: 560 });
    window.dispatchEvent(new CustomEvent("nexus:open-playground", { detail: { code } }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("nexus:open-playground", { detail: { code } }));
    }, 30);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("nexus:open-playground", { detail: { code } }));
    }, 100);
  };

  if (!isAssistant) {
    return <div className="font-medium leading-relaxed">{content}</div>;
  }

  return (
    <div className="prose prose-invert max-w-none text-xs leading-relaxed font-sans space-y-2">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-cyan-300 border-b border-cyan-500/20 pb-1 mt-2 mb-1.5 flex items-center gap-1.5">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-purple-300 mt-2 mb-1 flex items-center gap-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-cyan-200 mt-1.5 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <div className="my-1 text-slate-100 leading-relaxed font-normal">
              {children}
            </div>
          ),
          pre: ({ children }) => <>{children}</>,
          strong: ({ children }) => (
            <strong className="font-bold text-cyan-200 bg-cyan-950/40 px-1 py-0.5 rounded border border-cyan-500/30">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-purple-200 font-serif">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-1.5 space-y-1 text-slate-200 pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-1.5 space-y-1 text-slate-200 pl-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="my-0.5 text-slate-200 marker:text-cyan-400">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-400 pl-3 py-1 my-2 bg-cyan-950/20 rounded-r-lg italic text-slate-300">
              {children}
            </blockquote>
          ),
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            if (inline) {
              return (
                <code className="bg-slate-900 border border-slate-700/60 text-cyan-300 font-mono text-[11px] px-1.5 py-0.5 rounded shadow-inner">
                  {children}
                </code>
              );
            }

            return (
              <div className="nx-btn nx-btn-secondary relative my-2 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-[10px] text-slate-400 font-mono">
                  <span className="font-bold text-cyan-400">{match ? match[1] : "code"}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestCodeInPlayground(codeString)}
                      className="flex items-center gap-1 text-[10px] text-white font-bold nx-grad hover:opacity-90 transition-all py-0.5 px-2.5 rounded shadow"
                      title="Ouvrir et exécuter dans le Bac à Sable Nexus"
                    >
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>Tester / Aperçu</span>
                    </button>
                    <button
                      onClick={() => handleCopyCode(codeString)}
                      className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors py-0.5 px-2 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      {copiedCode === codeString ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <pre className="p-3 text-[11px] font-mono text-cyan-100 overflow-x-auto leading-relaxed">
                  <code>{codeString}</code>
                </pre>
              </div>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline decoration-cyan-400/50 hover:decoration-cyan-400 font-medium transition-all"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
