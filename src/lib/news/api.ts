import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getDesk = createServerFn({ method: "GET" })
  .validator(
    z.object({
      country: z
        .string()
        .min(2)
        .max(8)
        .regex(/^[A-Za-z]+$/)
        .transform((v) => v.toUpperCase()),
    }),
  )
  .handler(async ({ data }) => {
    const { loadDesk } = await import("./aggregate.server");
    return loadDesk(data.country);
  });
