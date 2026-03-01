import fs from "fs-extra";
import { buildContent, ProblemModel } from "hydrooj";
import yaml from "js-yaml";
import path from "path";

import type { IMigrateContext } from "./types";

interface IProblemTag {
    id: number;
    name: string;
}

/*
    `id` int NOT NULL AUTO_INCREMENT,
    `title` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
    `user_id` int NULL DEFAULT NULL,
    `publicizer_id` int NULL DEFAULT NULL,
    `is_anonymous` tinyint NULL DEFAULT NULL,
    `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `input_format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `output_format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `example` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `limit_and_hint` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `time_limit` int NULL DEFAULT NULL,
    `memory_limit` int NULL DEFAULT NULL,
    `additional_file_id` int NULL DEFAULT NULL,
    `ac_num` int NULL DEFAULT NULL,
    `submit_num` int NULL DEFAULT NULL,
    `is_public` tinyint NULL DEFAULT NULL,
    `file_io` tinyint NULL DEFAULT NULL,
    `file_io_input_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `file_io_output_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `publicize_time` datetime NULL DEFAULT NULL, 公开时间
    `type` enum('traditional','submit-answer','interaction') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'traditional',
*/
interface IProblemRow {
    id: number;
    title: string;
    user_id: number;
    publicizer_id: number;
    is_anonymous: number;
    description: string;
    input_format: string;
    output_format: string;
    example: string;
    limit_and_hint: string;
    time_limit: number;
    memory_limit: number;
    additional_file_id: number | null;
    ac_num: number | null;
    submit_num: number | null;
    is_public: number | null;
    file_io: number | null;
    file_io_input_name: string | null;
    file_io_output_name: string | null;
    publicize_time: Date | null;
    type: "traditional" | "submit-answer" | "interaction";
    allow_level: number;
}

interface ISyzojConfigYml {
    specialJudge?: {
        language: keyof typeof langMap;
        fileName: string;
    };
    subtasks?: {
        score: number;
        type: "sum" | "mul" | "min";
        cases: (string | number)[];
    }[];

    inputFile?: string;
    outputFile?: string;
    userOutput?: string;

    interactor?: {
        language: keyof typeof langMap;
        fileName: string;
    };

    extraSourceFiles?: {
        language: keyof typeof langMap;
        files: {
            name: string;
            dest: string;
        }[];
    }[];
}

const typeMap = {
    traditional: "default",
    "submit-answer": "submit_answer",
    interaction: "interactive",
} as const;

const langMap = {
    cpp: "cc.cc98",
    cpp11: "cc.cc11",
    cpp17: "cc.cc17",
    "cpp-noilinux": "cc.cc98",
    "cpp11-noilinux": "cc.cc11",
    "cpp11-clang": "cc.cc11",
    "cpp17-clang": "cc.cc17",
    c: "c",
    "c-noilinux": "c",
    csharp: "cs",
    java: "java",
    pascal: "pas",
    python2: "py.py2",
    python3: "py.py3",
    nodejs: "js",
    ruby: "rb",
    haskell: "hs",
} as const;

interface IProblemConfigYaml {
    type: (typeof typeMap)[keyof typeof typeMap];
    time?: `${number}ms`;
    memory?: `${number}MB`;
    filename?: string;
    checker_type?: "default" | "testlib" | "syzoj";
    checker?: {
        file: string;
        lang: (typeof langMap)[keyof typeof langMap] | "auto";
    };
    subtasks?: {
        score: number;
        type: "sum" | "mul" | "min";
        cases: {
            input: string;
            output: string;
        }[];
    }[];
    user_extra_files?: string[];
    subType?: string;
    interactor?: {
        file: string;
        lang: (typeof langMap)[keyof typeof langMap] | "auto";
    };
}

interface IMigrateProblemContext extends IMigrateContext {
    tagIdNameMap: Record<number, string>;
    pidMap: Record<string, number>;
    pidConfigYamlMap: Record<string, IProblemConfigYaml>;
    additionalFilePidMap: Record<string, string>;
    levelPidMap: Record<number, string[]>;
}

async function migrateTags(ctx: IMigrateProblemContext): Promise<Record<number, string>> {
    const { conn, report, tagIdNameMap } = ctx;

    const allTags: IProblemTag[] = await conn.query("SELECT * FROM `problem_tag`");
    for (const tag of allTags) tagIdNameMap[tag.id] = tag.name;
    report({ message: "tag finished" });

    return tagIdNameMap;
}

async function migrateContent(ctx: IMigrateProblemContext) {
    const {
        conn,
        report,
        args: { rerun, problemDomain },
        tagIdNameMap,
        pidMap,
        pidConfigYamlMap,
        additionalFilePidMap,
        levelPidMap,
    } = ctx;
    const migrateSubmission = ctx.args.modules.includes("submission");
    const [{ "count(*)": pcount }] = await conn.query<[{ "count(*)": number }]>("SELECT count(*) FROM `problem`");
    const step = 50;
    const pageCount = Math.ceil(Number(pcount) / step);

    for (let pageId = 0; pageId < pageCount; pageId++) {
        const problemRows: IProblemRow[] = await conn.query("SELECT * FROM `problem` LIMIT ?, ?", [
            pageId * step,
            step,
        ]);
        for (const problemRow of problemRows) {
            const pid = `P${problemRow.id}`;

            try {
                if (rerun) {
                    const pdoc = await ProblemModel.get(problemDomain, pid);
                    if (pdoc) pidMap[pid] = pdoc.docId;
                }

                if (!pidMap[pid]) {
                    const content = buildContent({
                        description: problemRow.description,
                        input: problemRow.input_format,
                        output: `${problemRow.output_format}\n## Sample\n${problemRow.example}`,
                        samples: [],
                        hint: problemRow.limit_and_hint,
                    });
                    const newPid = await ProblemModel.add(problemDomain, pid, problemRow.title, content, 1);
                    pidMap[pid] = newPid;
                }

                const tagRows: { tag_id: number }[] = await conn.query(
                    "SELECT * FROM `problem_tag_map` WHERE `problem_id` = ?",
                    [problemRow.id],
                );
                const tags = tagRows.map((tagRow) => tagIdNameMap[tagRow.tag_id]);

                await ProblemModel.edit(problemDomain, pidMap[pid], {
                    nAccept: migrateSubmission ? problemRow.ac_num || 0 : 0,
                    nSubmit: migrateSubmission ? problemRow.submit_num || 0 : 0,
                    hidden: problemRow.is_public !== 1,
                    tag: tags,
                });

                pidConfigYamlMap[pid].type = typeMap[problemRow.type];
                pidConfigYamlMap[pid].time = `${problemRow.time_limit}ms`;
                pidConfigYamlMap[pid].memory = `${problemRow.memory_limit}MB`;

                if (problemRow.file_io) {
                    pidConfigYamlMap[pid].filename = path.basename(problemRow.file_io_input_name!);
                }

                if (problemRow.additional_file_id) {
                    const additionalFileRows: [{ md5: string }] = await conn.query(
                        "SELECT * FROM `file` WHERE `id` = ?",
                        [problemRow.additional_file_id],
                    );
                    if (additionalFileRows.length) {
                        const [afdoc] = additionalFileRows;
                        additionalFilePidMap[afdoc.md5] = pid;
                    }
                }

                levelPidMap[problemRow.allow_level].push(pid);
            } catch (e) {
                report({ message: `Failed to migrate problem ${pid}: ${(e as Error)?.message}` });
            }
        }
    }
    report({ message: "problem finished" });

    return { pidMap, pidConfigYamlMap, additionalFilePidMap };
}

async function migrateAdditionalFiles(ctx: IMigrateProblemContext): Promise<void> {
    const {
        report,
        args: { problemDomain, dataDir },
        pidMap,
        additionalFilePidMap,
    } = ctx;

    const additionalFilePath = path.join(dataDir, "additional_file");
    const additionalFiles = await fs.readdir(additionalFilePath, { withFileTypes: true });
    for (const file of additionalFiles) {
        if (file.isDirectory()) continue;
        const md5 = file.name;
        if (!additionalFilePidMap[md5]) continue;
        const pid = additionalFilePidMap[md5];
        try {
            await ProblemModel.addAdditionalFile(
                problemDomain,
                pidMap[pid],
                `${pid}_additional_file.zip`,
                path.join(additionalFilePath, file.name),
            );
        } catch (e) {
            report({ message: `Failed to migrate additional file for ${pid}: ${(e as Error)?.message}` });
        }
    }

    report({ message: "additional files finished" });
}

async function migrateTestdata(ctx: IMigrateProblemContext) {
    const {
        report,
        args: { problemDomain, dataDir },
        pidConfigYamlMap,
        pidMap,
    } = ctx;

    // Migrate testdata and config.yaml
    const testdataPath = path.join(dataDir, "testdata");
    const testdataDirs = await fs.readdir(testdataPath, { withFileTypes: true });
    for (const testdataDir of testdataDirs) {
        if (!testdataDir.isDirectory()) continue;
        const pid = `P${testdataDir.name}`;
        const configYaml = pidConfigYamlMap[pid];
        const testdataDirPath = path.join(testdataPath, testdataDir.name);
        const testdataFiles = await fs.readdir(testdataDirPath, { withFileTypes: true });
        const pdoc = await ProblemModel.get(problemDomain, pidMap[pid], undefined, true);
        if (!pdoc) continue;

        try {
            report({ message: `Syncing testdata for ${pdoc.pid}` });

            for (const testdataFile of testdataFiles) {
                if (testdataFile.isDirectory()) continue;

                await ProblemModel.addTestdata(
                    problemDomain,
                    pdoc.docId,
                    testdataFile.name,
                    path.join(testdataDirPath, testdataFile.name),
                );

                if (testdataFile.name.startsWith("spj_")) {
                    report({ message: `Syncing spj for ${pdoc.pid}` });

                    const spjFilePath = path.join(testdataDirPath, testdataFile.name);
                    const spjContent = fs.readFileSync(spjFilePath, "utf8");
                    const isTestLib = spjContent.includes("registerTestlibCmd");
                    // spj_{lang}.xxx
                    const lang =
                        langMap[testdataFile.name.split("spj_")[1].split(".")[0] as keyof typeof langMap] || "auto";
                    configYaml.checker_type = isTestLib ? "testlib" : "syzoj";
                    configYaml.checker = {
                        file: testdataFile.name,
                        lang,
                    };
                }
            }

            const hasDataYml = testdataFiles.findIndex((i) => i.name === "data.yml") !== -1;
            if (hasDataYml) {
                report({ message: `Transferring data.yml for ${pdoc.pid}` });
                const syzojConfigYmlPath = path.join(testdataDirPath, "data.yml");
                const syzojConfigYml = yaml.load(
                    fs.readFileSync(syzojConfigYmlPath, "utf8").toString(),
                ) as ISyzojConfigYml;
                if (syzojConfigYml.specialJudge) {
                    report({ message: `Syncing spj config for ${pdoc.pid}` });

                    const spjFilePath = path.join(testdataDirPath, syzojConfigYml.specialJudge.fileName);
                    const spjContent = fs.readFileSync(spjFilePath, "utf8");
                    const isTestLib = spjContent.includes("registerTestlibCmd");
                    configYaml.checker_type = isTestLib ? "testlib" : "syzoj";
                    configYaml.checker = {
                        file: syzojConfigYml.specialJudge.fileName,
                        lang: langMap[syzojConfigYml.specialJudge.language] || "auto",
                    };
                }

                if (syzojConfigYml.subtasks && syzojConfigYml.inputFile && syzojConfigYml.outputFile) {
                    const { inputFile, outputFile } = syzojConfigYml;
                    configYaml.subtasks = syzojConfigYml.subtasks.map((subtask, index) => ({
                        score: subtask.score,
                        id: index + 1,
                        type: subtask.type,
                        cases: subtask.cases.map((caseItem) => ({
                            input: inputFile.replace("#", `${caseItem}`),
                            output: outputFile.replace("#", `${caseItem}`),
                        })),
                    }));
                }

                if (syzojConfigYml.extraSourceFiles && syzojConfigYml.extraSourceFiles.length > 0) {
                    for (const { name: sourceName, dest } of syzojConfigYml.extraSourceFiles[0].files) {
                        await ProblemModel.addTestdata(
                            problemDomain,
                            pdoc.docId,
                            dest,
                            path.join(testdataDirPath, sourceName),
                        );
                    }
                    configYaml.user_extra_files = syzojConfigYml.extraSourceFiles[0].files.map((x) => x.dest);
                }

                if (configYaml.type === "submit_answer") {
                    configYaml.subType = "multi";
                    configYaml.filename = syzojConfigYml.outputFile;
                }

                if (syzojConfigYml.interactor) {
                    report({ message: `Syncing interactor config for ${testdataDir.name}` });
                    configYaml.type = "interactive";

                    configYaml.interactor = {
                        file: syzojConfigYml.interactor.fileName,
                        lang: langMap[syzojConfigYml.interactor.language] || "auto",
                    };
                }
            }

            await ProblemModel.addTestdata(
                problemDomain,
                pdoc.docId,
                "config.yaml",
                Buffer.from(yaml.dump(configYaml)),
            );
        } catch (e) {
            report({ message: `Failed to migrate testdata for ${pid}: ${(e as Error)?.message}` });
        }
    }
}

async function migrateDomainCopy(ctx: IMigrateProblemContext) {
    const {
        report,
        args: { problemDomain, levelDomainMapping },
        levelPidMap,
        pidMap,
    } = ctx;

    for (const [level, targetDomain] of Object.entries({
        "0": "system",
        ...levelDomainMapping,
    })) {
        const pids = levelPidMap[Number(level)];
        for (const pid of pids) {
            const pdoc = await ProblemModel.get(problemDomain, pidMap[pid], undefined, true);
            if (!pdoc) continue;
            await ProblemModel.copy(problemDomain, pdoc.docId, targetDomain);
        }
    }

    report({ message: "domain copy finished" });
}

export async function migrateProblem(ctx: IMigrateContext): Promise<boolean> {
    const pctx: IMigrateProblemContext = {
        ...ctx,
        tagIdNameMap: {},
        pidMap: {},
        pidConfigYamlMap: new Proxy<Record<string, IProblemConfigYaml>>(
            {},
            {
                get(target, prop: string) {
                    return (target[prop] ??= {
                        type: "default",
                    });
                },
            },
        ),
        additionalFilePidMap: {},
        levelPidMap: new Proxy<Record<number, string[]>>(
            {},
            {
                get(target, prop: unknown) {
                    return (target[prop as number] ??= []);
                },
            },
        ),
    };

    // The dependency between different parts is as follows:
    // problem content <- problem tags
    // additional files <- problem content
    // testdata <- problem content
    // domain copy <- problem content, additional files, testdata
    await migrateTags(pctx);
    await migrateContent(pctx);
    await migrateAdditionalFiles(pctx);
    await migrateTestdata(pctx);
    await migrateDomainCopy(pctx);

    ctx.migratedModules.push("problem");

    return true;
}
