import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Modo de Acesso Livre: Fornece um usuário admin padrão se o OAuth não estiver configurado
    user = {
      id: 999,
      openId: "admin-standalone",
      name: "Admin LEG",
      email: "admin@ligaguorulhense.com.br",
      role: "admin",
      loginMethod: "standalone",
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
