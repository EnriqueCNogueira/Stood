"use client";

import { FIELD, FIELD_LABEL, INPUT } from "@/app/_components/ui";

export type FolderOption = { id: string; label: string };

export const FOLDER_NOT_FOUND_MESSAGE = "Esta Pasta não existe mais. Escolha outra.";

type FolderFieldProps = {
  label: string;
  folders: FolderOption[];
  // Nulo é a raiz do Stood
  value: string | null;
  onChange: (folderId: string | null) => void;
};

// Campo "Pasta" dos diálogos do Quadro; sem Pastas no Stood, tudo vai para a raiz e o campo não aparece
export function FolderField({ label, folders, value, onChange }: FolderFieldProps) {
  if (folders.length === 0) return null;
  return (
    <label className={FIELD}>
      <span className={FIELD_LABEL}>{label}</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className={INPUT}>
        <option value="">Raiz do Stood</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.label}
          </option>
        ))}
      </select>
    </label>
  );
}
