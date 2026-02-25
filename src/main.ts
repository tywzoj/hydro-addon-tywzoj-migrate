import { Context, Schema, SystemError, SystemModel } from "hydrooj";
import { IMigrateArgs } from "./types";
import { ToSchema } from "./utils";

export function apply(ctx: Context) {
    ctx.addScript(
        'migrateTywzoj', 'migrate from TYWZOJ',
        Schema.object<ToSchema<IMigrateArgs>>({
            dbHost: Schema.string().default('localhost'),
            dbPort: Schema.number().default(3306),
            dbName: Schema.string().default('tywzoj'),
            dbUser: Schema.string().required(),
            dbPassword: Schema.string().required(),
            problemDomain: Schema.string().default('problem'),
            dataDir: Schema.string().default('/opt/tywzoj/web/uploads'),
            modules: Schema.array(
                Schema.union(['problem', 'user', 'submission', 'contest', 'homework'])
            ).default(['problem']),
            levelDomainMapping: Schema.any().default({
                0: 'level_0',
                1: 'level_1',
                2: 'level_2',
                3: 'level_3',
                4: 'level_4',
                5: 'level_5',
                6: 'level_6',
            }),
            randomMail: Schema.union(['never', 'needed', 'always']).default('never'),
        }),
        async (args) => {
            const cur = await SystemModel.get('migrate.lock');
            if (cur) throw new SystemError(`migrate lock already exists: ${cur}, possible another migration is running`);

            return true;
        }
    );
}
