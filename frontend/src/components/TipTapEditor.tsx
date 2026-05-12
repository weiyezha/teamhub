import { useState, useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Code,
  Undo,
  Redo,
  Strikethrough,
} from 'lucide-react';
import { PromptDialog } from './PromptDialog';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onEditorReady?: (editor: Editor) => void;
  onImageUpload?: () => void;
}

export function TipTapEditor({ content, onChange, placeholder = '输入内容...', minHeight = '300px', onEditorReady, onImageUpload }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,  // Disable default link to avoid duplicate with Link extension below
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes into editor (e.g. when loading data in edit mode)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-btn overflow-hidden bg-bg-primary">
      <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 text-text-primary placeholder:text-text-tertiary outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

function EditorToolbar({ editor, onImageUpload }: { editor: Editor; onImageUpload?: () => void }) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptPlaceholder, setPromptPlaceholder] = useState('');
  const [promptCallback, setPromptCallback] = useState<(value: string) => void>(() => () => {});

  const showPrompt = (title: string, placeholder: string, callback: (value: string) => void) => {
    setPromptTitle(title);
    setPromptPlaceholder(placeholder);
    setPromptCallback(() => callback);
    setPromptOpen(true);
  };

  const btn = (onClick: () => void, icon: React.ReactNode, title: string, active = false, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-btn transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
      } disabled:opacity-40`}
    >
      {icon}
    </button>
  );

  const setLink = () => {
    showPrompt('插入链接', 'https://example.com', (url) => {
      if (url) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    });
  };

  const addImage = () => {
    if (onImageUpload) {
      onImageUpload();
      return;
    }
    showPrompt('插入图片', 'https://example.com/image.jpg', (url) => {
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    });
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-bg-secondary/50 flex-wrap">
      {btn(
        () => editor.chain().focus().toggleBold().run(),
        <Bold size={16} />,
        '加粗',
        editor.isActive('bold')
      )}
      {btn(
        () => editor.chain().focus().toggleItalic().run(),
        <Italic size={16} />,
        '斜体',
        editor.isActive('italic')
      )}
      {btn(
        () => editor.chain().focus().toggleStrike().run(),
        <Strikethrough size={16} />,
        '删除线',
        editor.isActive('strike')
      )}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        <Heading1 size={16} />,
        '大标题',
        editor.isActive('heading', { level: 1 })
      )}
      {btn(
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        <Heading2 size={16} />,
        '小标题',
        editor.isActive('heading', { level: 2 })
      )}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(
        () => editor.chain().focus().toggleBulletList().run(),
        <List size={16} />,
        '无序列表',
        editor.isActive('bulletList')
      )}
      {btn(
        () => editor.chain().focus().toggleOrderedList().run(),
        <ListOrdered size={16} />,
        '有序列表',
        editor.isActive('orderedList')
      )}
      {btn(
        () => editor.chain().focus().toggleBlockquote().run(),
        <Quote size={16} />,
        '引用',
        editor.isActive('blockquote')
      )}
      {btn(
        () => editor.chain().focus().toggleCodeBlock().run(),
        <Code size={16} />,
        '代码块',
        editor.isActive('codeBlock')
      )}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(setLink, <LinkIcon size={16} />, '插入链接', editor.isActive('link'))}
      {btn(addImage, <ImageIcon size={16} />, '插入图片')}
      <div className="flex-1" />
      {btn(
        () => editor.chain().focus().undo().run(),
        <Undo size={16} />,
        '撤销',
        false,
        !editor.can().undo()
      )}
      {btn(
        () => editor.chain().focus().redo().run(),
        <Redo size={16} />,
        '重做',
        false,
        !editor.can().redo()
      )}
      <PromptDialog
        open={promptOpen}
        title={promptTitle}
        placeholder={promptPlaceholder}
        onConfirm={(value) => {
          setPromptOpen(false);
          promptCallback(value);
        }}
        onCancel={() => setPromptOpen(false)}
      />
    </div>
  );
}
