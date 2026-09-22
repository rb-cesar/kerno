"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { BarVisualizer, ParticipantTile, useIsSpeaking, useTracks } from "@livekit/components-react";
import { type Participant, RemoteAudioTrack, Track } from "livekit-client";
import { Grid2x2, Volume2, VolumeX } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui";

const GRID_COLUMNS = 3;
const GAP = 12;
const FILMSTRIP_HEIGHT = 84;

type Rect = { top: number; left: number; width: number; height: number };

/** Mede o container em px ao vivo — os retângulos dos tiles são calculados em px, não %. */
function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

function computeGridRects(count: number, width: number, height: number): Rect[] {
  if (count === 0 || width === 0 || height === 0) return [];
  const cols = Math.min(GRID_COLUMNS, count);
  const rows = Math.ceil(count / cols);
  const cellW = (width - (cols - 1) * GAP) / cols;
  const cellH = (height - (rows - 1) * GAP) / rows;
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { top: row * (cellH + GAP), left: col * (cellW + GAP), width: cellW, height: cellH };
  });
}

function computeFocusRects(count: number, focusedIndex: number, width: number, height: number): Rect[] {
  if (count === 0 || width === 0 || height === 0) return [];
  const others = count - 1;
  const stripH = others > 0 ? FILMSTRIP_HEIGHT : 0;
  const thumbW = others > 0 ? (width - (others - 1) * GAP) / others : 0;
  const bigTop = others > 0 ? stripH + GAP : 0;
  const bigHeight = others > 0 ? height - stripH - GAP : height;

  let thumbCursor = 0;
  return Array.from({ length: count }, (_, i) => {
    if (i === focusedIndex) return { top: bigTop, left: 0, width, height: bigHeight };
    const rect = { top: 0, left: thumbCursor * (thumbW + GAP), width: thumbW, height: stripH };
    thumbCursor += 1;
    return rect;
  });
}

/** Silenciar só pra mim — `RemoteAudioTrack.setVolume` não afeta o que os outros ouvem. */
function MuteForMeButton({ micTrack }: { micTrack?: TrackReferenceOrPlaceholder }) {
  const [mutedForMe, setMutedForMe] = useState(false);
  const track = micTrack?.publication?.track;
  if (!(track instanceof RemoteAudioTrack)) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const next = !mutedForMe;
        track.setVolume(next ? 0 : 1);
        setMutedForMe(next);
      }}
      title={mutedForMe ? "Reativar áudio dessa pessoa" : "Silenciar só pra mim"}
      className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-black/45 text-white/80 hover:text-white"
    >
      {mutedForMe ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
    </button>
  );
}

/** Barras reativas à intensidade real do áudio — só aparecem enquanto a pessoa fala de verdade. */
function SpeakingBars({ participant, micTrack }: { participant: Participant; micTrack?: TrackReferenceOrPlaceholder }) {
  const isSpeaking = useIsSpeaking(participant);
  if (!isSpeaking || !micTrack) return null;
  return (
    <div className="absolute bottom-1.5 left-1.5 z-10 rounded-md bg-black/45 px-1.5 py-1">
      <BarVisualizer
        track={micTrack}
        barCount={4}
        options={{ minHeight: 25, maxHeight: 100 }}
        className="h-3.5 w-6 items-end gap-0.5"
      />
    </div>
  );
}

function Tile({
  rect,
  cameraTrack,
  micTrack,
  focused,
  onClick,
}: {
  rect: Rect;
  cameraTrack: TrackReferenceOrPlaceholder;
  micTrack?: TrackReferenceOrPlaceholder;
  focused: boolean;
  onClick: () => void;
}) {
  return (
    <div
      style={{ position: "absolute", top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      className={cn(
        "overflow-hidden rounded-lg transition-[top,left,width,height] duration-300 ease-out",
        !focused && "cursor-pointer",
      )}
    >
      {/* Sem children no ParticipantTile: passar children substitui o
          conteúdo padrão dele (vídeo/placeholder/nome) em vez de somar —
          os overlays ficam como irmãos, por cima, no mesmo wrapper posicionado.
          onParticipantClick (não um wrapper com role="button") porque o tile
          já carrega um <button> de verdade (silenciar pra mim) lá dentro, e
          <button> dentro de <button> não é válido. */}
      <ParticipantTile
        trackRef={cameraTrack}
        disableSpeakingIndicator={false}
        onParticipantClick={() => onClick()}
        className="h-full w-full"
      />
      <MuteForMeButton micTrack={micTrack} />
      <SpeakingBars participant={cameraTrack.participant} micTrack={micTrack} />
    </div>
  );
}

/**
 * Grade (padrão) e Destaque (clicar num participante) — os mesmos participantes,
 * só a posição/tamanho de cada tile muda; a transição CSS em top/left/width/height
 * é o que faz a troca parecer uma migração de verdade, não um corte seco.
 */
export function CallParticipantGrid() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.Microphone, withPlaceholder: true },
  ]);
  const [containerRef, size] = useContainerSize<HTMLDivElement>();
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);

  const cameraTracks = useMemo(() => tracks.filter((t) => t.source === Track.Source.Camera), [tracks]);
  const micByIdentity = useMemo(() => {
    const map = new Map<string, TrackReferenceOrPlaceholder>();
    for (const t of tracks) if (t.source === Track.Source.Microphone) map.set(t.participant.identity, t);
    return map;
  }, [tracks]);

  const focusedIndex = focusedIdentity ? cameraTracks.findIndex((t) => t.participant.identity === focusedIdentity) : -1;
  const isFocusMode = focusedIndex >= 0;

  const rects = isFocusMode
    ? computeFocusRects(cameraTracks.length, focusedIndex, size.width, size.height)
    : computeGridRects(cameraTracks.length, size.width, size.height);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {isFocusMode ? (
        <button
          type="button"
          onClick={() => setFocusedIdentity(null)}
          className="absolute right-1.5 z-20 flex items-center gap-1.5 rounded-md bg-black/45 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black/60"
          style={{ top: 6 }}
        >
          <Grid2x2 className="h-3.5 w-3.5" />
          Voltar pra grade
        </button>
      ) : null}
      {cameraTracks.map((cameraTrack, i) => (
        <Tile
          key={cameraTrack.participant.identity}
          rect={rects[i] ?? { top: 0, left: 0, width: 0, height: 0 }}
          cameraTrack={cameraTrack}
          micTrack={micByIdentity.get(cameraTrack.participant.identity)}
          focused={isFocusMode && i === focusedIndex}
          onClick={() => setFocusedIdentity(cameraTrack.participant.identity)}
        />
      ))}
    </div>
  );
}
