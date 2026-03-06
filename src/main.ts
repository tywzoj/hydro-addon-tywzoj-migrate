import type { Context } from "hydrooj";
import { Schema } from "hydrooj";

import { createContext, shouldMigrateModule } from "./common";
import { ensureDomain } from "./domain";
import { migrateProblem } from "./problem";
import type { IMigrateArgs } from "./types";

async function migrate(args: IMigrateArgs, report: (data: any) => void): Promise<boolean> {
    const ctx = await createContext(args, report);

    await ensureDomain(ctx);

    if (shouldMigrateModule(ctx, "user")) {
        // TODO: migrate user
    }

    if (shouldMigrateModule(ctx, "problem")) {
        await migrateProblem(ctx);
    }

    if (shouldMigrateModule(ctx, "submission", ["problem", "user"])) {
        // TODO: migrate submission
    }

    if (shouldMigrateModule(ctx, "contest", ["problem", "user"])) {
        // TODO: migrate contest
    }

    if (shouldMigrateModule(ctx, "homework", ["problem", "user"])) {
        // TODO: migrate homework
    }

    await ctx.conn.end();

    return true;
}

export function apply(ctx: Context) {
    ctx.addScript<IMigrateArgs>(
        "migrateTywzoj",
        "migrate from TYWZOJ",
        Schema.object({
            dbHost: Schema.string().default("localhost"),
            dbPort: Schema.number().default(3306),
            dbName: Schema.string().default("tywzoj"),
            dbUser: Schema.string().required(),
            dbPassword: Schema.string().required(),
            problemDomain: Schema.string().default("problem"),
            dataDir: Schema.string().default("/opt/tywzoj/web/uploads"),
            modules: Schema.array(Schema.union(["problem", "user", "submission", "contest", "homework"])).default([
                "problem",
            ]),
            levelDomainMapping: Schema.any().default({
                0: "level_0",
                1: "level_1",
                2: "level_2",
                3: "level_3",
                4: "level_4",
                5: "level_5",
                6: "level_6",
            }),
            randomMail: Schema.union(["never", "needed", "always"]).default("never"),
            owner: Schema.number().default(1),
        }),
        migrate,
    );
}
