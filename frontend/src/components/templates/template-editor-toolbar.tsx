"use client";

import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  compact?: boolean;
  children: ReactNode;
}

function ToolbarButton({ label, active, disabled, onClick, compact, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors",
        compact ? "h-6.5 w-6.5" : "h-8 w-8",
        "hover:border-border hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "border-border bg-accent text-primary"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator({ compact }: { compact?: boolean }) {
  return <span className={cn("h-4 w-px shrink-0 bg-border", compact ? "mx-0.5" : "mx-1")} aria-hidden="true" />;
}

function LinkButton({ editor, compact }: { editor: Editor; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const isActive = editor.isActive("link");
  const iconClassName = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <span>
          <ToolbarButton label="Link" active={isActive} compact={compact}>
            <Link2 className={iconClassName} />
          </ToolbarButton>
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-64"
        align="start"
        // Same rationale as VariablePicker — the form below focuses the
        // editor itself on save/remove, so don't let Radix race it back to
        // the toolbar button on close.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = url.trim();

            if (trimmed) {
              editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
            } else {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            }

            setOpen(false);
          }}
        >
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="h-8 text-sm"
            autoFocus
          />
          <Button type="submit" size="sm">
            Save
          </Button>
        </form>

        {isActive ? (
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setOpen(false);
            }}
            className="mt-2 flex items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-destructive"
          >
            <Link2Off className="h-3.5 w-3.5" />
            Remove link
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function TemplateEditorToolbar({
  editor,
  endActions,
  compact = false,
}: {
  editor: Editor;
  endActions?: ReactNode;
  /** Smaller buttons/icons/padding for tight contexts like an inline reply
   * composer, where the full template-editor toolbar reads as too heavy. */
  compact?: boolean;
}) {
  const iconClassName = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div
      className={cn(
        "flex items-center overflow-x-auto border-b border-border/70 bg-card/80 backdrop-blur",
        compact ? "gap-px px-2 py-1.5" : "gap-0.5 px-3 py-2.5",
      )}
    >
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        compact={compact}
      >
        <Bold className={iconClassName} />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        compact={compact}
      >
        <Italic className={iconClassName} />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        compact={compact}
      >
        <UnderlineIcon className={iconClassName} />
      </ToolbarButton>

      <ToolbarSeparator compact={compact} />

      <ToolbarButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        compact={compact}
      >
        <Heading1 className={iconClassName} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        compact={compact}
      >
        <Heading2 className={iconClassName} />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        compact={compact}
      >
        <Quote className={iconClassName} />
      </ToolbarButton>

      <ToolbarSeparator compact={compact} />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        compact={compact}
      >
        <List className={iconClassName} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        compact={compact}
      >
        <ListOrdered className={iconClassName} />
      </ToolbarButton>

      {compact ? null : (
        <>
          <ToolbarSeparator />

          <ToolbarButton
            label="Align left"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className={iconClassName} />
          </ToolbarButton>
        </>
      )}

      <ToolbarSeparator compact={compact} />

      <LinkButton editor={editor} compact={compact} />

      {endActions ? (
        <>
          <ToolbarSeparator compact={compact} />
          {endActions}
        </>
      ) : null}
    </div>
  );
}
