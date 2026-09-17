export { editorTheme, TRANSFORMERS, URL_MATCHER } from "./config";
export {
  $computeActiveFormats,
  type ActiveFormats,
  ActiveFormatsPlugin,
  CodeHighlightPlugin,
  EmojiShortcutPlugin,
  ExitBlockOnArrowDownPlugin,
  NO_FORMATS,
  PasteMarkdownPlugin,
  SubmitPlugin,
} from "./plugins/behaviors";
export { EmojiPickerButton, EmojiTypeaheadPlugin } from "./plugins/emoji";

// Blocos reutilizáveis — para quem monta o próprio LexicalComposer (ex.: o
// composer de chat, que precisa de estado além do que RichTextEditor cobre).
export {
  $createMentionNode,
  $isMentionNode,
  MENTION_TRANSFORMER,
  type MentionMember,
  MentionNode,
  MentionTypeaheadPlugin,
} from "./plugins/mention";
export { SlashCommandPlugin } from "./plugins/slash";
export {
  $createTaskMentionNode,
  $isTaskMentionNode,
  TASK_MENTION_TRANSFORMER,
  TaskMentionNode,
  TaskMentionTypeaheadPlugin,
  type TaskRef,
} from "./plugins/task-ref";
export { RichTextEditor } from "./rich-text-editor";
export { RichTextView } from "./rich-text-view";
