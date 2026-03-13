-- RedefineTables: add prompt_tokens, completion_tokens, cached_tokens, cache_write_tokens, message_cost to workspace_chats
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_workspace_chats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workspaceId" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "include" BOOLEAN NOT NULL DEFAULT true,
    "user_id" INTEGER,
    "thread_id" INTEGER,
    "api_session_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackScore" BOOLEAN,
    "prompt_tokens" INTEGER DEFAULT 0,
    "completion_tokens" INTEGER DEFAULT 0,
    "cached_tokens" INTEGER DEFAULT 0,
    "cache_write_tokens" INTEGER DEFAULT 0,
    "message_cost" REAL DEFAULT 0.0,
    "llm_model" TEXT DEFAULT '',
    CONSTRAINT "workspace_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workspace_chats" ("api_session_id", "createdAt", "feedbackScore", "id", "include", "lastUpdatedAt", "llm_model", "prompt", "response", "thread_id", "user_id", "workspaceId") SELECT "api_session_id", "createdAt", "feedbackScore", "id", "include", "lastUpdatedAt", "llm_model", "prompt", "response", "thread_id", "user_id", "workspaceId" FROM "workspace_chats";
DROP TABLE "workspace_chats";
ALTER TABLE "new_workspace_chats" RENAME TO "workspace_chats";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
