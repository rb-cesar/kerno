-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "channelId" TEXT,
    "conversationId" TEXT,
    "startedBy" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallParticipant" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "CallParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Call_workspaceId_idx" ON "Call"("workspaceId");

-- CreateIndex
CREATE INDEX "Call_channelId_idx" ON "Call"("channelId");

-- CreateIndex
CREATE INDEX "Call_conversationId_idx" ON "Call"("conversationId");

-- CreateIndex
CREATE INDEX "CallParticipant_callId_idx" ON "CallParticipant"("callId");

-- CreateIndex
CREATE INDEX "CallParticipant_userId_idx" ON "CallParticipant"("userId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;
