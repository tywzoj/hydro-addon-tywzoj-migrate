import mariadb from "mariadb";

import type { IMigrateArgs, IMigrateContext } from "./types";

export async function createContext(args: IMigrateArgs, report: (data: any) => void): Promise<IMigrateContext> {
    const conn = await mariadb.createConnection({
        host: args.dbHost,
        port: args.dbPort,
        user: args.dbUser,
        password: args.dbPassword,
        database: args.dbName,
        connectTimeout: 15000,
    });
    return { conn, args, report };
}
