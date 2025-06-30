import { prepareCCIPTransaction } from "./prepareCCIPTransaction";
import { trackCCIPStatus } from "./trackCCIPStatus";

export const ccipActions = [
  prepareCCIPTransaction,
  trackCCIPStatus
];