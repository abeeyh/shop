// #162: avatares prontos da loja (decisão do dono: sem upload de foto). A chave fica em users.avatar.
export const AVATARS = ["sword", "shield", "wand", "skull", "crown", "flame", "ghost", "gem"] as const;
export type AvatarKey = (typeof AVATARS)[number];
export const isAvatar = (v: unknown): v is AvatarKey => AVATARS.includes(v as AvatarKey);
