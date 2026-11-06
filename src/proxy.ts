import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// RN-81: detecta idioma por Accept-Language / cookie e redireciona para /<locale>
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
