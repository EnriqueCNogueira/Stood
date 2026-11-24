type UserAvatarProps = { name: string; email: string; image: string | null; className: string };

// Foto do provedor ou, sem ela, a inicial; a foto vem direto do Google ou do GitHub, sem dizer de que página
export function UserAvatar({ name, email, image, className }: UserAvatarProps) {
  return (
    <span className={`grid flex-none place-items-center overflow-hidden rounded-full border border-border bg-surface-2 font-semibold ${className}`}>
      {image ? <img src={image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" /> : buildInitial(name, email)}
    </span>
  );
}

// Sem foto do provedor, o avatar mostra a inicial do nome (ou do e-mail, se o nome vier vazio)
function buildInitial(name: string, email: string) {
  return (name.trim() || email).charAt(0).toUpperCase();
}
