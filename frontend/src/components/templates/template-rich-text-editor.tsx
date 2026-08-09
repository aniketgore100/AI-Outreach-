"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import type { ReactNode } from "react";

import { TemplateEditorToolbar } from "@/components/templates/template-editor-toolbar";

interface TemplateRichTextEditorProps {
  /** Initial content only — Tiptap owns the content after mount. To load a
   * *different* template into this editor, remount it with a new `key`
   * (the parent keys this component by template id) rather than relying on
   * this prop to resync live. */
  content: string;
  onChange: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onFocus?: () => void;
  placeholder?: string;
  toolbarEndActions?: ReactNode;
  showToolbar?: boolean;
  editorClassName?: string;
  /** Smaller toolbar buttons/icons/padding — for tight contexts like an
   * inline reply composer rather than the full template editor. */
  compact?: boolean;
}

export function TemplateRichTextEditor({
  content,
  onChange,
  onEditorReady,
  onFocus,
  placeholder,
  toolbarEndActions,
  showToolbar = true,
  editorClassName,
  compact = false,
}: TemplateRichTextEditorProps) {
  const editor = useEditor({
    // Required for Next.js SSR — Tiptap otherwise warns/mismatches because
    // the server render and the first client render can't agree on content.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your email…" }),
    ],
    content,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    onFocus: () => onFocus?.(),
      editorProps: {
        attributes: {
          class: `email-content min-h-[12rem] px-5 py-4 text-[15px] leading-7 focus:outline-none ${editorClassName ?? ""}`,
        },
      },
    });

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-card">
      {showToolbar && editor ? (
        <TemplateEditorToolbar editor={editor} endActions={toolbarEndActions} compact={compact} />
      ) : null}
      <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
