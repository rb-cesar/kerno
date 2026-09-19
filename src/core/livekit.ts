import { AccessToken, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";

// SFU self-hosted (docker-compose) — mesma chave/segredo do container LiveKit
// (ver livekit.yaml). RoomServiceClient só é usado pra encerrar uma call pra
// todo mundo (deleteRoom); a criação da room é implícita no 1º join válido
// (room.auto_create é true por padrão no LiveKit).
const apiKey = process.env.LIVEKIT_API_KEY ?? "";
const apiSecret = process.env.LIVEKIT_API_SECRET ?? "";

export const livekitRoomService = new RoomServiceClient(
  process.env.LIVEKIT_URL ?? "http://localhost:7880",
  apiKey,
  apiSecret,
);

export const livekitWebhookReceiver = new WebhookReceiver(apiKey, apiSecret);

/** Token de acesso a uma room, escopado a um único participante. */
export async function mintLivekitToken(identity: string, name: string, roomName: string): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret, { identity, name });
  at.addGrant({ roomJoin: true, room: roomName });
  return at.toJwt();
}
