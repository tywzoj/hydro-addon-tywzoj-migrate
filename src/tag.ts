import { type Context, DomainModel, ProblemModel, Schema } from "hydrooj";

export function applyRenameTags(ctx: Context) {
    ctx.addScript<{ domainIds: string[]; tagMapping: Record<string, string[]> }>(
        "renameProblemTags",
        "rename problem tags",
        Schema.object({
            domainIds: Schema.array(Schema.string()).default(["system"]),
            tagMapping: Schema.any().required(),
        }),
        async (args, report: (data: any) => void) => {
            const domainIds =
                args.domainIds.length > 0
                    ? args.domainIds
                    : await DomainModel.getMulti()
                          .map((ddoc) => ddoc._id)
                          .toArray();

            for (const domainId of domainIds) {
                const pCount = await ProblemModel.count(domainId, {});
                const pageSize = 100;
                const pageCount = Math.ceil(pCount / pageSize);
                for (let page = 0; page < pageCount; page++) {
                    const pdocs = await ProblemModel.getMulti(domainId, {}, ["pid", "docId", "tag"])
                        .sort({ pid: 1 })
                        .skip(page * pageSize)
                        .limit(pageSize)
                        .toArray();

                    for (const pdoc of pdocs) {
                        try {
                            let modified = false;
                            const newTags = Array.from(
                                new Set(
                                    pdoc.tag
                                        .map((tag) => {
                                            const normalizedTag = tag.trim().toLowerCase();
                                            if (args.tagMapping[tag] || args.tagMapping[normalizedTag]) {
                                                modified = true;
                                                return args.tagMapping[tag] || args.tagMapping[normalizedTag];
                                            }
                                            return [tag];
                                        })
                                        .flat(),
                                ),
                            );

                            if (modified) {
                                await ProblemModel.edit(domainId, pdoc.docId, { tag: newTags });
                            }
                        } catch (error) {
                            report({ message: `Error processing problem ${pdoc.pid} in domain ${domainId}` });
                            report({ message: `${(error as Error).message}\n${(error as Error).stack}` });
                        }
                    }
                }
                report({ message: `Completed processing domain ${domainId}.` });
            }

            report({ message: "Completed renaming problem tags." });

            return true;
        },
    );
}
