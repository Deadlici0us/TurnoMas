import createMiddleware from "next-intl/middleware";
import intlConfig from "./next-intl.config";

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};

export default createMiddleware(intlConfig);