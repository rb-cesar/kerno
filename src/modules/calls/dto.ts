import { z } from "zod";

export const startCallInputSchema = z
  .object({
    channelId: z.string().min(1).optional(),
    conversationId: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.channelId) !== Boolean(v.conversationId), {
    message: "Informe channelId ou conversationId, não ambos",
  });
export type StartCallInput = z.infer<typeof startCallInputSchema>;
