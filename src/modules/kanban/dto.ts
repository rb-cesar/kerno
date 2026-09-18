import { z } from "zod";

// Entrada validada na fronteira HTTP (zValidator no controller). O tipo é
// derivado do schema — uma declaração só, não duas (schema + union manual).
// Validação aqui é estrutural (forma, tipos, não-vazio); regras de negócio
// (trim, limites de tamanho, "documento vazio" etc.) continuam no service —
// zod não duplica o que já é checado lá, só barra requisições malformadas
// antes de chegar no service.

const id = z.string().min(1);
const statusCategorySchema = z.enum(["BACKLOG", "UNSTARTED", "STARTED", "COMPLETED", "CANCELED"]);
const prioritySchema = z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]);

export const kanbanCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("createBoard"), workspaceId: id, name: z.string() }),
  z.object({ type: z.literal("renameBoard"), boardId: id, name: z.string() }),
  z.object({ type: z.literal("deleteBoard"), boardId: id }),
  z.object({
    type: z.literal("createColumn"),
    boardId: id,
    name: z.string(),
    category: statusCategorySchema.optional(),
  }),
  z.object({ type: z.literal("renameColumn"), columnId: id, name: z.string() }),
  z.object({
    type: z.literal("updateColumn"),
    columnId: id,
    name: z.string(),
    category: statusCategorySchema,
    wipLimit: z.number().int().nullable(),
  }),
  z.object({ type: z.literal("deleteColumn"), columnId: id }),
  z.object({ type: z.literal("reorderColumns"), boardId: id, columnIds: z.array(id) }),
  z.object({ type: z.literal("createCard"), columnId: id, title: z.string() }),
  z.object({
    type: z.literal("updateCard"),
    cardId: id,
    title: z.string(),
    description: z.string().nullable(),
    assignedTo: id.nullable(),
    labelIds: z.array(id),
    priority: prioritySchema,
    dueDate: z.string().nullable(),
    estimate: z.number().nullable(),
    cycleId: id.nullable(),
    storyId: id.nullable(),
  }),
  z.object({
    type: z.literal("moveCard"),
    cardId: id,
    fromColumnId: id,
    toColumnId: id,
    destCardIds: z.array(id),
    sourceCardIds: z.array(id),
  }),
  z.object({ type: z.literal("deleteCard"), cardId: id }),
  z.object({ type: z.literal("createSubtask"), parentId: id, title: z.string() }),
  z.object({ type: z.literal("createChecklist"), cardId: id, title: z.string().optional() }),
  z.object({ type: z.literal("renameChecklist"), checklistId: id, title: z.string().nullable() }),
  z.object({ type: z.literal("deleteChecklist"), checklistId: id }),
  z.object({ type: z.literal("addChecklistItem"), checklistId: id, text: z.string() }),
  z.object({ type: z.literal("toggleChecklistItem"), itemId: id, done: z.boolean() }),
  z.object({ type: z.literal("updateChecklistItem"), itemId: id, text: z.string() }),
  z.object({ type: z.literal("deleteChecklistItem"), itemId: id }),
  z.object({ type: z.literal("addComment"), cardId: id, body: z.string() }),
  z.object({ type: z.literal("deleteComment"), commentId: id }),
  z.object({ type: z.literal("createLabel"), boardId: id, name: z.string(), color: z.string() }),
  z.object({ type: z.literal("deleteLabel"), labelId: id }),
  z.object({
    type: z.literal("createCycle"),
    workspaceId: id,
    name: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
  }),
  z.object({ type: z.literal("deleteCycle"), cycleId: id }),
  z.object({ type: z.literal("createStory"), boardId: id, title: z.string() }),
  z.object({
    type: z.literal("updateStory"),
    storyId: id,
    title: z.string(),
    description: z.string().nullable(),
    status: statusCategorySchema,
    assignedTo: id.nullable(),
    dueDate: z.string().nullable(),
    priority: prioritySchema,
    color: z.string().nullable(),
  }),
  z.object({ type: z.literal("deleteStory"), storyId: id }),
]);

export type KanbanCommand = z.infer<typeof kanbanCommandSchema>;
