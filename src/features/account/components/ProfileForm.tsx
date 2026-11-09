"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { updateProfile, type ProfileState } from "../actions";
import { AVATARS } from "../avatars";
import { Avatar } from "./Avatar";

type Props = {
  name: string;
  avatar: string | null;
  labels: { name: string; avatar: string; none: string; save: string; saved: string; error: string };
  avatarNames: Record<string, string>; // nome de cada avatar no idioma (leitor de tela e dica)
};

// #162: nome e avatar pronto (rádios: teclado e leitor de tela já sabem usar)
export function ProfileForm({ name, avatar, labels, avatarNames }: Props) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, { status: "idle" });
  const choice =
    "cursor-pointer rounded-full p-0.5 ring-offset-2 ring-offset-card has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring";
  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{labels.name}</span>
        <Input name="name" maxLength={40} defaultValue={name} autoComplete="nickname" />
      </label>
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1 font-semibold text-foreground">{labels.avatar}</legend>
        <div className="flex flex-wrap gap-3">
          <label className={choice} title={labels.none}>
            <input
              type="radio"
              name="avatar"
              value=""
              defaultChecked={!avatar}
              className="sr-only"
              aria-label={labels.none}
            />
            <Avatar avatar={null} name={name || "?"} />
          </label>
          {AVATARS.map((a) => (
            <label key={a} className={choice} title={avatarNames[a]}>
              <input
                type="radio"
                name="avatar"
                value={a}
                defaultChecked={avatar === a}
                className="sr-only"
                aria-label={avatarNames[a]}
              />
              <Avatar avatar={a} name={name} />
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonVariants({ size: "sm" })}>
          {labels.save}
        </button>
        <p role="status" className="text-sm">
          {state.status === "ok" ? labels.saved : null}
        </p>
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-error-text">
            {labels.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
