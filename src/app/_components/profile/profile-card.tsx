"use client";

import { Pencil, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { MoodPicker } from "@/app/_components/mood-picker";
import { ProfileEditor } from "@/app/_components/profile/profile-editor";
import { CARD, ICON_BUTTON } from "@/app/_components/ui";
import { UserAvatar } from "@/app/_components/user-avatar";
import { buildPhotoUrl, type Mood } from "@/lib/profile/rules";

type ProfileCardProps = {
  name: string;
  nickname: string | null;
  bio: string | null;
  mood: Mood | null;
  email: string;
  photoVersion: number | null;
  providerImage: string | null;
};

// Dados do Perfil: a visão de sempre, centralizada, e a edição que o lápis abre
export function ProfileCard({ name, nickname, bio, mood, email, photoVersion, providerImage }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  function toggle() {
    setIsSaved(false);
    setIsEditing((editing) => !editing);
  }

  function closeEditor({ hasSaved }: { hasSaved: boolean }) {
    setIsSaved(hasSaved);
    setIsEditing(false);
  }

  // Os botões da edição somem ao fechar, então o foco volta ao lápis, que fica desligado durante o salvar
  useEffect(() => {
    if (wasEditing.current && !isEditing && !isSaving) {
      wasEditing.current = false;
      toggleRef.current?.focus();
    }
    if (isEditing) wasEditing.current = true;
  }, [isEditing, isSaving]);

  return (
    <section aria-labelledby="profile-data" className={`${CARD} relative grid grid-cols-1 gap-4 bg-surface p-4 md:p-5`}>
      <h2 id="profile-data" className="text-center text-base font-medium">
        {isEditing ? "Editar Perfil" : "Dados"}
      </h2>
      <button
        ref={toggleRef}
        type="button"
        aria-label={isEditing ? "Cancelar a edição" : "Editar Perfil"}
        aria-expanded={isEditing}
        disabled={isSaving}
        onClick={toggle}
        className={`${ICON_BUTTON} absolute top-3 right-3`}
      >
        {isEditing ? <X size={16} aria-hidden /> : <Pencil size={16} aria-hidden />}
      </button>

      {isEditing ? (
        <ProfileEditor
          name={name}
          nickname={nickname ?? ""}
          bio={bio ?? ""}
          email={email}
          photoVersion={photoVersion}
          providerImage={providerImage}
          isSaving={isSaving}
          startSaving={startSaving}
          onClose={closeEditor}
        />
      ) : (
        <div className="grid grid-cols-1 justify-items-center gap-3 text-center">
          <UserAvatar
            name={name}
            email={email}
            image={buildPhotoUrl({ photoVersion, providerImage })}
            className="size-24 text-4xl"
          />
          <div className="grid max-w-full gap-0.5">
            <p className="text-2xl font-medium tracking-tight wrap-anywhere">{name}</p>
            {nickname && <p className="text-text-muted wrap-anywhere">{nickname}</p>}
          </div>
          {bio && <p className="max-w-md text-ui text-balance wrap-anywhere">{bio}</p>}
          <MoodPicker mood={mood} align="center" />
          <p className="max-w-full text-ui text-text-muted wrap-anywhere">{email}</p>
        </div>
      )}
      <p role="status" className="sr-only">
        {isSaved ? "Perfil salvo." : ""}
      </p>
    </section>
  );
}
