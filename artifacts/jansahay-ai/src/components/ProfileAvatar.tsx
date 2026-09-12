import { UserRound } from "lucide-react";

export function ProfileAvatar({
  name,
  avatarUrl,
  size = "size-8",
  className = "",
}: {
  name: string;
  avatarUrl?: string;
  size?: string;
  className?: string;
}) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))] ${className}`}>
      {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : name.trim() ? name.trim().slice(0, 1).toUpperCase() : <UserRound size={16} />}
    </span>
  );
}
