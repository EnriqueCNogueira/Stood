"use client";

import { X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import {
  type CreateVideoFileActionResult,
  type FetchVideoPreviewActionResult,
  createVideoFileAction,
  fetchVideoPreviewAction,
} from "@/app/_components/workspace/board/file-actions";
import { MAX_NAME_LENGTH, buildSuggestedName, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";
import { parseYouTubeVideoId } from "@/lib/video/link";
import type { YouTubeVideo } from "@/lib/video/youtube";

// Espera o Usuário parar de digitar antes de consultar o YouTube
const PREVIEW_DELAY_MS = 400;
const UNEXPECTED_MESSAGE = "Não foi possível adicionar o Vídeo. Tente de novo.";

// Toda recusa possível do modal tem mensagem: um reason novo sem texto não compila
type DialogReason =
  | Exclude<FetchVideoPreviewActionResult | CreateVideoFileActionResult, { ok: true }>["reason"]
  | "link-invalido"
  | "inesperado";

const REASON_MESSAGES: Record<DialogReason, string> = {
  "link-invalido": "Cole o link de um vídeo do YouTube, como youtube.com/watch?v=… ou youtu.be/….",
  "video-nao-encontrado": "Não encontramos esse vídeo no YouTube. Confira o link.",
  "video-indisponivel": "Este vídeo é privado ou não pode ser aberto fora do YouTube.",
  "youtube-fora-do-ar": "Não foi possível falar com o YouTube agora. Tente de novo.",
  "video-invalido": UNEXPECTED_MESSAGE,
  "nome-vazio": "Dê um nome ao Vídeo.",
  "nome-longo": `O nome pode ter até ${MAX_NAME_LENGTH} caracteres.`,
  "nome-com-separador": "O nome não pode ter / nem \\.",
  "nome-com-espaco-nas-pontas": "Tire o espaço do começo ou do fim do nome.",
  "nome-repetido": "Este Stood já tem um Vídeo com esse nome.",
  "stood-nao-encontrado": "Este Stood não existe mais.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

type Preview =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "error"; reason: DialogReason }
  | { status: "ready"; video: YouTubeVideo };

type VideoDialogProps = {
  stoodId: string;
  onAdded: (file: StoodTreeFile) => void;
  onClose: () => void;
};

// Modal de "Novo Arquivo > Vídeo": monta já aberto e desmonta ao fechar, então cada abertura começa limpa
export function VideoDialog({ stoodId, onAdded, onClose }: VideoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Só a resposta do último link digitado vale; as anteriores chegam e são ignoradas
  const requestRef = useRef(0);
  const titleId = useId();
  const previewErrorId = useId();
  const submitErrorId = useId();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Preview>({ status: "empty" });
  const [name, setName] = useState("");
  const [submitReason, setSubmitReason] = useState<DialogReason | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNameError = submitReason !== null && submitReason.startsWith("nome");

  useEffect(() => {
    dialogRef.current?.showModal();
    urlRef.current?.focus();
    return () => clearTimeout(timerRef.current);
  }, []);

  function changeUrl(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setUrl(value);
    setSubmitReason(null);
    clearTimeout(timerRef.current);
    const requestId = ++requestRef.current;
    const videoId = parseYouTubeVideoId(value);

    if (value.trim() === "") {
      setPreview({ status: "empty" });
      return;
    }
    if (!videoId) {
      timerRef.current = setTimeout(() => setPreview({ status: "error", reason: "link-invalido" }), PREVIEW_DELAY_MS);
      return;
    }
    if (preview.status === "ready" && preview.video.id === videoId) return;
    setPreview({ status: "loading" });
    timerRef.current = setTimeout(() => loadPreview(videoId, requestId), PREVIEW_DELAY_MS);
  }

  async function loadPreview(videoId: string, requestId: number) {
    let next: Preview;
    try {
      const result = await fetchVideoPreviewAction({ videoId });
      next = result.ok ? { status: "ready", video: result.video } : { status: "error", reason: result.reason };
    } catch {
      next = { status: "error", reason: "inesperado" };
    }
    if (requestId !== requestRef.current) return;
    setPreview(next);
    if (next.status === "ready") setName(buildSuggestedName(next.video.title));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview.status !== "ready") return;
    const validation = validateName(name);
    if (!validation.ok) {
      setSubmitReason(validation.reason);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createVideoFileAction({ stoodId, videoId: preview.video.id, name });
        if (!result.ok) {
          setSubmitReason(result.reason);
          return;
        }
        onAdded(result.file);
        dialogRef.current?.close();
      } catch {
        setSubmitReason("inesperado");
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto rounded-lg border border-border bg-surface text-text shadow-card backdrop:bg-bg/70"
    >
      <form onSubmit={submit} noValidate className="grid w-md max-w-full gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-medium tracking-tight">
            Novo Vídeo
          </h2>
          <button type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()} className={ICON_BUTTON}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <label className={FIELD}>
          <span className={FIELD_LABEL}>Link do YouTube</span>
          <input
            ref={urlRef}
            type="url"
            name="url"
            value={url}
            onChange={changeUrl}
            placeholder="https://www.youtube.com/watch?v=…"
            autoComplete="off"
            aria-invalid={preview.status === "error"}
            aria-describedby={preview.status === "error" ? previewErrorId : undefined}
            className={INPUT}
          />
        </label>

        <VideoPreview preview={preview} errorId={previewErrorId} />

        {preview.status === "ready" && (
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Nome</span>
            <input
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSubmitReason(null);
              }}
              autoComplete="off"
              aria-invalid={isNameError}
              aria-describedby={isNameError ? submitErrorId : undefined}
              className={INPUT}
            />
            <span className={`justify-self-end font-mono text-meta ${name.length > MAX_NAME_LENGTH ? "text-danger" : "text-text-muted"}`}>
              {name.length}/{MAX_NAME_LENGTH}
            </span>
          </label>
        )}

        {submitReason && (
          <FormMessage tone="error" id={submitErrorId}>
            {REASON_MESSAGES[submitReason]}
          </FormMessage>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={preview.status !== "ready" || isPending}
            className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}
          >
            Adicionar
          </button>
        </div>
      </form>
    </dialog>
  );
}

function VideoPreview({ preview, errorId }: { preview: Preview; errorId: string }) {
  if (preview.status === "error") {
    return (
      <FormMessage tone="error" id={errorId}>
        {REASON_MESSAGES[preview.reason]}
      </FormMessage>
    );
  }
  if (preview.status === "empty") {
    return (
      <p className="grid aspect-video place-content-center rounded-md border border-dashed border-border px-6 text-center text-ui text-text-muted">
        Cole o link para ver o vídeo antes de adicionar.
      </p>
    );
  }
  if (preview.status === "loading") {
    return (
      <div aria-busy="true" className="grid gap-2">
        <span className="sr-only" role="status">
          Buscando o vídeo no YouTube…
        </span>
        <div className="aspect-video animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none" />
        <div className="h-4 w-3/4 animate-pulse rounded-sm bg-surface-2 motion-reduce:animate-none" />
        <div className="h-3 w-1/3 animate-pulse rounded-sm bg-surface-2 motion-reduce:animate-none" />
      </div>
    );
  }

  const { video } = preview;
  return (
    <figure className="grid gap-2">
      {/* A miniatura vem do YouTube; sem referrer, o YouTube não fica sabendo de qual Stood ela foi pedida */}
      <img
        src={video.thumbnailUrl}
        alt=""
        width={480}
        height={360}
        referrerPolicy="no-referrer"
        className="aspect-video w-full rounded-md bg-surface-2 object-cover"
      />
      <figcaption className="grid gap-0.5">
        <strong className="line-clamp-2 font-medium">{video.title}</strong>
        <span className="text-ui text-text-muted">{video.channelName}</span>
      </figcaption>
    </figure>
  );
}
