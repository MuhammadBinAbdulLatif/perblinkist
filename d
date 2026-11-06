[33mcommit 82ed89421107f87174362ea31d490c52442e0ae2[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m)[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Fri Nov 6 15:59:08 2026 +0500

    authors and history

[33mcommit a9bef97dd2cc1858bde54fe1b730efe7afb41417[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Fri Nov 6 07:49:37 2026 +0500

    responsive design for mobile screens

[33mcommit 1825779f597904c5f7183f992d6765479ee14e6e[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 20:49:37 2026 +0500

    non secure cookie in case you don't have tls

[33mcommit 4001f80c543b2a261e37df49e7cc8bb4fb3f3a17[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 20:11:33 2026 +0500

    parralell proccessing / ingestion of media

[33mcommit 8b244a21ebfcc7d2f811c8cf20ae024dfa04f1e9[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 19:43:27 2026 +0500

    added support for insecure cookies incase using home lab configuration

[33mcommit 2a2ff63cc070e521912b99d3837400f9a5ef4fdd[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 17:57:27 2026 +0500

    fix(docker): hoist pnpm node_modules so Prisma client COPY succeeds
    
    pnpm's nested .pnpm layout left node_modules/.prisma missing in the runner stage; use node-linker=hoisted and trace includes so GHCR builds can find the generated client.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

[33mcommit 85268024617cd678ca880e55626609dd6cfb8a7e[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 17:52:38 2026 +0500

    added workflow to push to container repository

[33mcommit 47d2188a9885de69c399a7938890aae05c0124b8[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 17:51:02 2026 +0500

    bad docker compose resolved

[33mcommit 5455a555bb9c748c25b110cf7426fa21220e437d[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 16:30:01 2026 +0500

    fix(docker): set DATABASE_URL placeholder at build time, copy prisma client correctly, add .dockerignore

[33mcommit 504e4f2c50edaeabb917bdd6616c42b117092fb3[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 16:09:16 2026 +0500

    chore: clean up .gitignore and untrack example-files audio binaries

[33mcommit 0bac59dafef4a9aadf7acf351206bf3d32482292[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 16:07:37 2026 +0500

    (Feat): initial version created and ready for vigorous testing

[33mcommit 7669d25f332539b862b34bd5fa45c04741df95a2[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 16:06:32 2026 +0500

    (Feat): initial version created and ready for vigorous testing

[33mcommit 350472dfd26e14b748ce00648871833dcf331bd6[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 16:05:55 2026 +0500

    (Feat): initial version created and ready for vigorous testing

[33mcommit e391cab0f9e6cb16ad17822a5abf38d8348e91d7[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 14:08:09 2026 +0500

    docs(specs): add requirements, plan, and validation checklist for audiobook detail page and recommendations

[33mcommit b4624cea182a4c1aa94651a63a7d8e7099df6c12[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 13:56:02 2026 +0500

    feat(ingestion): implement 10-item batching, exponential rate-limit backoff, and state tracking

[33mcommit 9d5e13ad22f864939efdc6446157c851da8e159e[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 13:50:44 2026 +0500

    docs(specs): add requirements, plan, and validation checklist for resilient batch ingestion

[33mcommit dfd1104f29058d2205a8065cf079a1dd27c00f23[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 13:43:07 2026 +0500

    fix(auth): set session cookie via Next.js native cookies API and sync all preferences into markdown specs

[33mcommit 20b75e3e150aebe3ed5cc1ad378fb75a1c06455a[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 13:23:18 2026 +0500

    feat(auth): add sign-up navigation and security question password recovery

[33mcommit 4c98091264413e9ffd137d93f439be485eeea401[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 13:18:20 2026 +0500

    docs(specs): add requirements, plan, and validation checklist for auth UX overhaul and password recovery

[33mcommit bb13fd6b197a9572fdad5b16e23e5621b6282b48[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 13:02:00 2026 +0500

    feat(docker): implement production multi-stage Dockerfile and docker-compose orchestration with read-only media mount

[33mcommit 9554b9bda8c80ff227af7cda5f02b6179b65148b[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 13:00:52 2026 +0500

    docs(specs): add requirements, plan, and validation checklist for Docker containerization

[33mcommit b4852f354551c6a6bde0d80addf050f2302e788d[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:59:57 2026 +0500

    feat(ui): initialize official shadcn with Button, Input, Card, and Badge components

[33mcommit fed3dee4817c0dfd4c71fc772a4d3fa8091ce227[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:55:30 2026 +0500

    style: overhaul UI to formal shadcn/zinc theme, custom architectural logo, and split-screen auth with literary quote

[33mcommit 52e09e5747cacdfa9775e3d89e6c079548488403[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:50:36 2026 +0500

    feat(auth): implement basic authentication with bcrypt hashing, JWT session cookies, and flashy emerald UI

[33mcommit dab4bc38e815a398b600b97f434be2d7350a5753[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:47:12 2026 +0500

    docs(specs): define visual style guide and basic authentication requirements

[33mcommit 930554904942fa97b5766c2b39e7243a2fba5c51[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:40:11 2026 +0500

    feat(sync): implement zero-network incremental media change detection and file signature tracking

[33mcommit e4eac52b4cc8267a2ace92672aa4fb3e08ba8ae0[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:38:10 2026 +0500

    docs(specs): add requirements, plan, and validation checklist for incremental media sync

[33mcommit 62ebe6045756959aa60059232a08dc4ab5ace1f0[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:35:54 2026 +0500

    feat(streaming): implement RFC 7233 byte-range audio streaming with zero-buffer kernel piping and Docker path translation

[33mcommit afcb23f2b8de90c5ecf061534338c6623e3f03a6[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:34:30 2026 +0500

    docs(specs): add requirements, plan, and validation checklist for audio streaming media server

[33mcommit 8bcc4fe586c0005ecf7f22516035d8a59c0b2481[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:30:24 2026 +0500

    feat(ingestion): complete media ingestion pipeline with Matroska audio parsing and open API enrichment

[33mcommit 500bb578340cf74fa098bbc9cb6a9fc55e316156[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:28:02 2026 +0500

    docs(specs): add requirements, plan, and validation checklist for ingestion pipeline

[33mcommit d25cd89b3b096b90ebbc8498de1d2219c9ae583b[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:16:43 2026 +0500

    feat: establish tRPC architecture, Prisma SQLite models, and specs-first development rules

[33mcommit f0cc8beb7c53bb1f0cb25aec1e731b7159a9e55b[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 12:06:17 2026 +0500

    Primsa added

[33mcommit 6eb444cd473e8dc5fc4ca2f7d6c9bd92d5177d99[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 11:52:04 2026 +0500

    project initialized

[33mcommit 77bee17bcf553adc36fc44f4d58bd6be4b5b21e9[m
Author: Muhammad <ibneabdullatifjud@gmail.com>
Date:   Thu Nov 5 11:38:50 2026 +0500

    docs: create agent guidelines and core specifications for PerBlinkist
