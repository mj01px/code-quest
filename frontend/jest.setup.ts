import "@testing-library/jest-dom";

import { esquecerProgresso } from "@/lib/cacheDeProgresso";

beforeEach(() => {
  esquecerProgresso();
});
