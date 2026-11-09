"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/navigation";
import { saveNoteAction } from "@/src/app-actions/notes";
import { EMPTY_NOTE_DOCUMENT } from "@/src/lib/note-content";

type SaveState = "saved" | "unsaved" | "saving" | "error";

type NoteEditorProps = {
  noteId: string | null;
  initialTitle: string;
  initialContent: JSONContent;
};

type ToolbarState = {
  paragraph: boolean;
  heading2: boolean;
  heading3: boolean;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  bulletList: boolean;
  orderedList: boolean;
  code: boolean;
  blockquote: boolean;
  link: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

function selectToolbarState({ editor }: { editor: Editor | null }): ToolbarState | null {
  if (!editor) return null;
  return {
    paragraph: editor.isActive("paragraph"),
    heading2: editor.isActive("heading", { level: 2 }),
    heading3: editor.isActive("heading", { level: 3 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    strike: editor.isActive("strike"),
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    code: editor.isActive("code"),
    blockquote: editor.isActive("blockquote"),
    link: editor.isActive("link"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };
}

function ToolbarButton({
  active,
  children,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={active ? "editor-tool is-active" : "editor-tool"}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function NoteEditor({ noteId, initialTitle, initialContent }: NoteEditorProps) {
  const router = useRouter();
  const [currentNoteId, setCurrentNoteId] = useState(noteId);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>(noteId === null ? "unsaved" : "saved");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasUnsavedChanges = useRef(false);
  const activeSave = useRef<Promise<boolean> | null>(null);
  const navigationInProgress = useRef(false);
  const revision = useRef(0);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<(submitAfterSave: boolean) => Promise<boolean>>(async () => false);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSaveTimer.current = null;
      void saveRef.current(false);
    }, 950);
  }, []);

  const markUnsaved = useCallback(() => {
    revision.current += 1;
    hasUnsavedChanges.current = true;
    setSaveState("unsaved");
    setSaveError("");
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleEditorUpdate = useCallback(() => {
    markUnsaved();
  }, [markUnsaved]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        link: {
          protocols: ["http", "https"],
          openOnClick: false,
          isAllowedUri: (url, { defaultValidate }) => {
            try {
              const parsed = new URL(url);
              return (
                (parsed.protocol === "http:" || parsed.protocol === "https:") &&
                !parsed.username &&
                !parsed.password &&
                defaultValidate(url)
              );
            } catch {
              return false;
            }
          },
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
    ],
    [],
  );
  const editorProps = useMemo(
    () => ({
      attributes: {
        class: "note-editor-content",
        "aria-label": "Note content",
      },
    }),
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent ?? EMPTY_NOTE_DOCUMENT,
    immediatelyRender: false,
    onUpdate: handleEditorUpdate,
    editorProps,
  });

  const toolbarState = useEditorState({ editor, selector: selectToolbarState });

  function handleSave(submitAfterSave = false): Promise<boolean> {
    if (!editor) return Promise.resolve(false);

    if (activeSave.current) {
      return activeSave.current.then((saved) => {
        if (!saved) return false;
        if (hasUnsavedChanges.current) return handleSave(submitAfterSave);
        if (submitAfterSave) router.push("/notes");
        return true;
      });
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }

    const savedRevision = revision.current;
    const serializedContent = JSON.stringify(editor.getJSON());
    setIsSaving(true);
    setSaveState("saving");
    setSaveError("");

    const request = (async (): Promise<boolean> => {
      try {
        const result = await saveNoteAction({
          id: currentNoteId,
          title,
          contentJson: serializedContent,
        });

        if (!result.success) {
          setSaveState("error");
          setSaveError(result.message);
          return false;
        }

        setCurrentNoteId(result.id);

        if (revision.current === savedRevision) {
          hasUnsavedChanges.current = false;
          setSaveState("saved");
        } else {
          hasUnsavedChanges.current = true;
          setSaveState("unsaved");
          scheduleAutoSave();
        }

        return true;
      } catch {
        setSaveState("error");
        setSaveError("We couldn't save your note. Please try again.");
        return false;
      } finally {
        setIsSaving(false);
      }
    })();

    activeSave.current = request;

    return request.then((saved) => {
      if (activeSave.current === request) activeSave.current = null;
      if (!saved) return false;
      if (hasUnsavedChanges.current) return handleSave(submitAfterSave);
      if (submitAfterSave) router.push("/notes");
      return true;
    });
  }

  saveRef.current = handleSave;

  useEffect(() => {
    function handleNavigationClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !hasUnsavedChanges.current
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.closest(".note-editor-content") ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (navigationInProgress.current) return;
      navigationInProgress.current = true;

      void saveRef
        .current(false)
        .then((saved) => {
          if (!saved || hasUnsavedChanges.current) {
            navigationInProgress.current = false;
            return;
          }

          router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        })
        .catch(() => {
          navigationInProgress.current = false;
        });
    }

    function handleFormSubmit(event: SubmitEvent) {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        form.classList.contains("note-editor-form") ||
        !hasUnsavedChanges.current
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      if (navigationInProgress.current) return;
      navigationInProgress.current = true;
      const submitter = event.submitter;

      void saveRef
        .current(false)
        .then((saved) => {
          if (!saved || hasUnsavedChanges.current) {
            navigationInProgress.current = false;
            return;
          }

          navigationInProgress.current = false;
          if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
            form.requestSubmit(submitter);
          } else {
            form.requestSubmit();
          }
        })
        .catch(() => {
          navigationInProgress.current = false;
        });
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    document.addEventListener("click", handleNavigationClick, true);
    document.addEventListener("submit", handleFormSubmit, true);
    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      document.removeEventListener("click", handleNavigationClick, true);
      document.removeEventListener("submit", handleFormSubmit, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [router]);

  useEffect(
    () => () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
        if (hasUnsavedChanges.current) void saveRef.current(false);
      }
    },
    [],
  );

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.currentTarget.value);
    markUnsaved();
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave(true);
  }

  function handleParagraph() {
    editor?.chain().focus().setParagraph().run();
  }

  function handleHeading2() {
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  }

  function handleHeading3() {
    editor?.chain().focus().toggleHeading({ level: 3 }).run();
  }

  function handleToggleBold() {
    editor?.chain().focus().toggleBold().run();
  }

  function handleToggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }

  function handleToggleStrike() {
    editor?.chain().focus().toggleStrike().run();
  }

  function handleToggleBulletList() {
    editor?.chain().focus().toggleBulletList().run();
  }

  function handleToggleOrderedList() {
    editor?.chain().focus().toggleOrderedList().run();
  }

  function handleToggleCode() {
    editor?.chain().focus().toggleCode().run();
  }

  function handleToggleBlockquote() {
    editor?.chain().focus().toggleBlockquote().run();
  }

  function handleUndo() {
    editor?.chain().focus().undo().run();
  }

  function handleRedo() {
    editor?.chain().focus().redo().run();
  }

  function handleAddLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const value = window.prompt("Enter an http or https link");
    if (!value) return;
    try {
      const url = new URL(value);
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
        setSaveError("Enter a valid http or https link.");
        setSaveState("error");
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.toString() }).run();
    } catch {
      setSaveError("Enter a valid http or https link.");
      setSaveState("error");
    }
  }

  function handleClear() {
    editor?.commands.clearContent();
  }

  const toolbarDisabled = !editor || isSaving;
  const saveLabel =
    saveState === "saving"
      ? "Saving"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Could not save"
          : "Unsaved changes";

  return (
    <form className="note-editor-form" onSubmit={handleFormSubmit}>
      <div className="note-editor-heading-controls">
        <label className="note-title-field" htmlFor="note-title">
          <span>Title</span>
          <input
            autoComplete="off"
            disabled={isSaving}
            id="note-title"
            maxLength={200}
            onChange={handleTitleChange}
            placeholder="Untitled note"
            value={title}
          />
        </label>
        <div className="note-save-controls">
          <p aria-live="polite" className={`save-status save-status-${saveState}`} role="status">
            {saveLabel}
          </p>
        </div>
      </div>

      <div aria-label="Text formatting" className="editor-toolbar" role="toolbar">
        <ToolbarButton
          active={toolbarState?.paragraph}
          disabled={toolbarDisabled}
          label="Paragraph"
          onClick={handleParagraph}
        >
          P
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.heading2}
          disabled={toolbarDisabled}
          label="Heading 2"
          onClick={handleHeading2}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.heading3}
          disabled={toolbarDisabled}
          label="Heading 3"
          onClick={handleHeading3}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.bold}
          disabled={toolbarDisabled}
          label="Bold"
          onClick={handleToggleBold}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.italic}
          disabled={toolbarDisabled}
          label="Italic"
          onClick={handleToggleItalic}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.strike}
          disabled={toolbarDisabled}
          label="Strikethrough"
          onClick={handleToggleStrike}
        >
          <s>S</s>
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.bulletList}
          disabled={toolbarDisabled}
          label="Bulleted list"
          onClick={handleToggleBulletList}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.orderedList}
          disabled={toolbarDisabled}
          label="Numbered list"
          onClick={handleToggleOrderedList}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.code}
          disabled={toolbarDisabled}
          label="Inline code"
          onClick={handleToggleCode}
        >
          Code
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.blockquote}
          disabled={toolbarDisabled}
          label="Block quote"
          onClick={handleToggleBlockquote}
        >
          Quote
        </ToolbarButton>
        <ToolbarButton
          active={toolbarState?.link}
          disabled={toolbarDisabled}
          label="Add or remove link"
          onClick={handleAddLink}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled || !toolbarState?.canUndo}
          label="Undo"
          onClick={handleUndo}
        >
          Undo
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled || !toolbarState?.canRedo}
          label="Redo"
          onClick={handleRedo}
        >
          Redo
        </ToolbarButton>
      </div>

      <div className="note-editor-surface">
        <EditorContent editor={editor} />
      </div>

      {saveError ? (
        <p className="note-editor-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="note-editor-footer">
        <button
          className="secondary-button"
          disabled={!editor || isSaving}
          onClick={handleClear}
          type="button"
        >
          Clear
        </button>
        <button className="auth-submit note-submit" disabled={!editor || isSaving} type="submit">
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
