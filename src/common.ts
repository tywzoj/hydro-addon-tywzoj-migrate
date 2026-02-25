import { IMigrateArgs, IMigrateCtx } from "./types";
import mariadb from 'mariadb';

export async function createContext(args: IMigrateArgs): Promise<IMigrateCtx> {
    const conn = await mariadb.createConnection({
        host: args.dbHost,
        port: args.dbPort,
        user: args.dbUser,
        password: args.dbPassword,
        database: args.dbName,
        connectTimeout: 15000,
    });
    return { conn, args };
}
