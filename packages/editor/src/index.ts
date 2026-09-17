export { RichTextEditor } from "./rich-text-editor";
export { RichTextView } from "./rich-text-view";
export { TRANSFORMERS, URL_MATCHER, editorTheme } from "./config";

// Blocos reutilizáveis — para quem monta o próprio LexicalComposer (ex.: o
// composer de chat, que precisa de estado além do que RichTextEditor cobre).
export {
  MENTION_TRANSFORMER,
  MentionNode,
  MentionTypeaheadPlugin,
  $createMentionNode,
  $isMentionNode,
  type MentionMember,
} from "./plugins/mention";
export {
  TASK_MENTION_TRANSFORMER,
  TaskMentionNode,
  TaskMentionTypeaheadPlugin,
  $createTaskMentionNode,
  $isTaskMentionNode,
  type TaskRef,
} from "./plugins/task-ref";
export { EmojiPickerButton, EmojiTypeaheadPlugin } from "./plugins/emoji";
export { SlashCommandPlugin } from "./plugins/slash";
export {
  ActiveFormatsPlugin,
  CodeHighlightPlugin,
  EmojiShortcutPlugin,
  ExitBlockOnArrowDownPlugin,
  NO_FORMATS,
  PasteMarkdownPlugin,
  SubmitPlugin,
  $computeActiveFormats,
  type ActiveFormats,
} from "./plugins/behaviors";
