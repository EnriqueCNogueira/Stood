"use client";

import { ImageUp, Trash2, Undo2 } from "lucide-react";
import { type ChangeEvent, useEffect, useId } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { buildJpeg } from "@/app/_components/jpeg";
import type { UpsertPhotoActionResult } from "@/app/_components/profile/profile-actions";
import { BUTTON } from "@/app/_components/ui";
import { UserAvatar } from "@/app/_components/user-avatar";
import { IMAGE_ACCEPT, IMAGE_HEADER_BYTES, MAX_IMAGE_BYTES, parseImageType } from "@/lib/file/image";
import { buildCenteredSquare, buildPhotoUrl, PHOTO_SIDE_PIXELS, validatePhoto } from "@/lib/profile/rules";

export type PhotoFieldReason = Extract<UpsertPhotoActionResult, { ok: false }>["reason"] | "arquivo-grande" | "imagem-ilegivel";

const UNEXPECTED_MESSAGE = "Não foi possível salvar a Foto. Tente de novo.";
const MAX_IMAGE_MEGABYTES = MAX_IMAGE_BYTES / (1024 * 1024);

const REASON_MESSAGES: Record<PhotoFieldReason, string> = {
  "foto-vazia": "Este arquivo está vazio.",
  "foto-grande": UNEXPECTED_MESSAGE,
  "foto-invalida": "Use uma imagem PNG, JPEG ou WebP.",
  "arquivo-grande": `A imagem pode ter até ${MAX_IMAGE_MEGABYTES} MB.`,
  "imagem-ilegivel": "Não foi possível abrir esta imagem. Escolha outra.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
};

// Mudança da Foto ainda não salva
export type PhotoChange = { kind: "picked"; jpeg: Blob; previewUrl: string } | { kind: "removed" };

type PhotoFieldProps = {
  name: string;
  email: string;
  photoVersion: number | null;
  providerImage: string | null;
  change: PhotoChange | null;
  reason: PhotoFieldReason | null;
  isDisabled: boolean;
  // A recusa mantém a mudança que havia antes
  onChange: (change: PhotoChange | null, refusal: PhotoFieldReason | null) => void;
};

// Foto na edição do Perfil: mostra a prévia já recortada, e quem grava é o "Salvar" da edição
export function PhotoField({ name, email, photoVersion, providerImage, change, reason, isDisabled, onChange }: PhotoFieldProps) {
  const errorId = useId();
  const previewUrl = change?.kind === "picked" ? change.previewUrl : null;
  const currentVersion = change?.kind === "removed" ? null : photoVersion;
  const hasPhoto = previewUrl !== null || currentVersion !== null;
  const buttonClass = `${BUTTON.base} ${BUTTON.sm}`;

  // A prévia é um link para os bytes na memória do navegador: some ao trocar, salvar ou cancelar
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Sem limpar, escolher de novo o mesmo arquivo não dispara o onChange
    input.value = "";
    if (!file) return;
    const result = await buildPhoto(file);
    if (!result.ok) return onChange(null, result.reason);
    onChange({ kind: "picked", jpeg: result.jpeg, previewUrl: URL.createObjectURL(result.jpeg) }, null);
  }

  return (
    <div className="grid justify-items-center gap-3 text-center">
      <UserAvatar
        name={name}
        email={email}
        image={previewUrl ?? buildPhotoUrl({ photoVersion: currentVersion, providerImage })}
        className="size-24 text-4xl"
      />
      <div className="flex flex-wrap justify-center gap-2">
        <label
          className={`${buttonClass} ${BUTTON.secondary} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent`}
        >
          <ImageUp size={14} aria-hidden />
          {hasPhoto ? "Trocar foto" : "Escolher foto"}
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={isDisabled}
            aria-describedby={reason ? errorId : undefined}
            onChange={(event) => void pickPhoto(event)}
            className="sr-only"
          />
        </label>
        {change && (
          <button type="button" disabled={isDisabled} onClick={() => onChange(null, null)} className={`${buttonClass} ${BUTTON.ghost}`}>
            <Undo2 size={14} aria-hidden />
            Desfazer
          </button>
        )}
        {!change && photoVersion !== null && (
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onChange({ kind: "removed" }, null)}
            className={`${buttonClass} ${BUTTON.ghost}`}
          >
            <Trash2 size={14} aria-hidden />
            Remover foto
          </button>
        )}
      </div>
      <p className="text-meta text-text-muted">
        {change
          ? "É assim que a sua foto vai ficar depois de salvar."
          : `PNG, JPEG ou WebP, até ${MAX_IMAGE_MEGABYTES} MB. Fica o quadrado do centro.`}
      </p>
      {reason && (
        <FormMessage tone="error" id={errorId}>
          {REASON_MESSAGES[reason]}
        </FormMessage>
      )}
    </div>
  );
}

// Confere o arquivo escolhido com a regra das Imagens e o reduz à Foto que o servidor aceita
async function buildPhoto(file: File): Promise<{ ok: true; jpeg: Blob } | { ok: false; reason: PhotoFieldReason }> {
  if (file.size === 0) return { ok: false, reason: "foto-vazia" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: "arquivo-grande" };
  try {
    const header = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer());
    if (!parseImageType(header)) return { ok: false, reason: "foto-invalida" };

    const bitmap = await createImageBitmap(file);
    const { x, y, side } = buildCenteredSquare(bitmap.width, bitmap.height);
    const area = { x, y, width: side, height: side };
    const jpeg = await buildJpeg(bitmap, area, { width: PHOTO_SIDE_PIXELS, height: PHOTO_SIDE_PIXELS });
    bitmap.close();

    const validation = validatePhoto(new Uint8Array(await jpeg.arrayBuffer()));
    return validation.ok ? { ok: true, jpeg } : validation;
  } catch {
    return { ok: false, reason: "imagem-ilegivel" };
  }
}
