import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { campaignProgressEmitter } from "~/server/workflows/campaign-workflow";

export const campaignProgress = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      campaignId: z.number(),
    })
  )
  .subscription(async function* ({ input }) {
    // Verify token
    let userId: number;
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);
      userId = parsed.userId;
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }

    // Verify campaign ownership
    const campaign = await db.campaign.findUnique({
      where: { id: input.campaignId },
    });

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      });
    }

    if (campaign.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this campaign",
      });
    }

    // Subscribe to campaign progress events
    const eventKey = `campaign-${input.campaignId}`;
    
    // Create a queue to buffer events
    const eventQueue: any[] = [];
    let resolveNext: (() => void) | null = null;

    const listener = (data: any) => {
      eventQueue.push(data);
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    };

    campaignProgressEmitter.on(eventKey, listener);

    try {
      // Send initial status
      yield {
        type: "status",
        status: campaign.status,
      };

      // Stream events as they come in
      while (true) {
        if (eventQueue.length > 0) {
          const event = eventQueue.shift();
          yield event;
          
          // If campaign is complete, end the stream
          if (event.type === "complete") {
            break;
          }
        } else {
          // Wait for next event
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
      }
    } finally {
      campaignProgressEmitter.off(eventKey, listener);
    }
  });
