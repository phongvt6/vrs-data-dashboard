import { makeGet } from "@/lib/tu-doanh/handler";
import { catalogApi } from "@/lib/tu-doanh/core";

export const GET = makeGet(catalogApi);
