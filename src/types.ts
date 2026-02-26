import type { Connection } from "mariadb";

export type E_MigrateModules = "problem" | "user" | "submission" | "contest" | "homework";
export type E_RandomMail = "never" | "needed" | "always";

export interface IMigrateArgs {
    dbHost: string;
    dbPort: number;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    problemDomain: string;
    levelDomainMapping: Record<number, string>;
    dataDir: string;
    modules: E_MigrateModules[];
    randomMail: E_RandomMail;
    rerun: boolean;
}

export interface IMigrateContext {
    conn: Connection;
    args: IMigrateArgs;
    migratedModules: E_MigrateModules[];
    report: (data: any) => void;
}
