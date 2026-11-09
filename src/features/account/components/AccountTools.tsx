"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Tooltip } from "@/components/atoms/Tooltip";
import { Avatar } from "./Avatar";
import { signOut } from "../actions";

type Props = {
  locale: string;
  signedIn: boolean;
  avatar?: { avatar: string | null; name: string }; // #162: logado, o avatar no lugar do ícone
  iconClass: string;
  labels: { account: string; signIn: string; signOut: string };
};

// #130: usuário e "sair" lado a lado no cabeçalho. Entrar e sair voltam para a página atual (?voltar=;
// o servidor só aceita caminho interno — features/account/next.ts).
function Tools({ locale, signedIn, iconClass, labels, path, avatar }: Props & { path: string | null }) {
  const back = path ? `?voltar=${encodeURIComponent(path)}` : "";
  const userLabel = signedIn ? labels.account : labels.signIn;
  return (
    <>
      <Tooltip label={userLabel}>
        <Link
          href={signedIn ? `/${locale}/conta` : `/${locale}/entrar${back}`}
          aria-label={userLabel}
          className={iconClass}
        >
          {avatar ? (
            <Avatar avatar={avatar.avatar} name={avatar.name} className="size-full text-sm" />
          ) : (
            <UserRound aria-hidden="true" className="size-5" />
          )}
        </Link>
      </Tooltip>
      {signedIn ? (
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          {path ? <input type="hidden" name="next" value={path} /> : null}
          <Tooltip label={labels.signOut}>
            <button type="submit" aria-label={labels.signOut} className={iconClass}>
              <LogOut aria-hidden="true" className="size-5" />
            </button>
          </Tooltip>
        </form>
      ) : null}
    </>
  );
}

function WithPath(props: Props) {
  return <Tools {...props} path={usePathname()} />;
}

// a URL só existe na requisição (cacheComponents): até lá, os mesmos botões sem o "voltar"
export function AccountTools(props: Props) {
  return (
    <Suspense fallback={<Tools {...props} path={null} />}>
      <WithPath {...props} />
    </Suspense>
  );
}
