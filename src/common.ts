import mariadb from "mariadb";

import type { E_MigrateModules, IMigrateArgs, IMigrateContext } from "./types";

export async function createContext(args: IMigrateArgs, report: (data: any) => void): Promise<IMigrateContext> {
    const conn = await mariadb.createConnection({
        host: args.dbHost,
        port: args.dbPort,
        user: args.dbUser,
        password: args.dbPassword,
        database: args.dbName,
        connectTimeout: 15000,
    });
    return { conn, args, report, migratedModules: [] };
}

export function shouldMigrateModule(
    ctx: IMigrateContext,
    module: E_MigrateModules,
    deps: E_MigrateModules[] = [],
): boolean {
    const {
        args: { modules },
        migratedModules,
    } = ctx;
    return modules.includes(module) && deps.every((dep) => migratedModules.includes(dep));
}
