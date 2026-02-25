import { DomainModel } from "hydrooj";

import type { IMigrateContext } from "./types";

declare module "hydrooj" {
    interface DomainDoc {
        share?: string;
    }
}

export async function ensureDomain(ctx: IMigrateContext) {
    const {
        args: { problemDomain, levelDomainMapping },
    } = ctx;

    const problemDomainDoc = await DomainModel.get(problemDomain);
    if (!problemDomainDoc) {
        const domainId = await DomainModel.add(
            problemDomain,
            1,
            "Problem",
            "The domain for migrated problems from TYWZOJ",
        );
        await DomainModel.edit(domainId, { share: "*" });
    } else if (problemDomainDoc.share !== "*") {
        await DomainModel.edit(problemDomainDoc._id, { share: "*" });
    }

    for (const [level, levelDomain] of Object.entries(levelDomainMapping)) {
        const levelDomainDoc = await DomainModel.get(levelDomain);
        if (!levelDomainDoc) {
            await DomainModel.add(
                levelDomain,
                1,
                `Level ${level}`,
                `The domain for migrated problems with level ${level} from TYWZOJ`,
            );
        }
    }
}
