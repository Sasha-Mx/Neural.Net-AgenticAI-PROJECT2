import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const createBrandProfile = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string().min(1, "Profile name is required"),
      brandColorPrimary: z.string().optional(),
      brandColorSecondary: z.string().optional(),
      visualStyle: z.string().optional(),
      imageryPreference: z.string().optional(),
      brandThemes: z.string().optional(),
      fontFamily: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
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

    // Create brand profile
    const profile = await db.brandProfile.create({
      data: {
        userId,
        name: input.name,
        brandColorPrimary: input.brandColorPrimary,
        brandColorSecondary: input.brandColorSecondary,
        visualStyle: input.visualStyle,
        imageryPreference: input.imageryPreference,
        brandThemes: input.brandThemes,
        fontFamily: input.fontFamily,
      },
    });

    return profile;
  });
