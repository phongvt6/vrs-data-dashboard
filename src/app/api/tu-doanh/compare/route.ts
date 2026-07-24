import { makeGet } from "@/lib/tu-doanh/handler";
import { compare } from "@/lib/tu-doanh/core";

export const GET = makeGet(compare);
