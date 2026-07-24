import { makeGet } from "@/lib/tu-doanh/handler";
import { meta } from "@/lib/tu-doanh/core";

export const GET = makeGet(() => meta());
